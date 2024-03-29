import { Server } from 'socket.io';
import { IOServer, CreateLiveActivityInfo } from '~api/ws';
import { jwtVerify, importJWK } from 'jose';
import * as dotenv from 'dotenv';
import { isNotNull } from '~utils/typeguards';
import UserManager from './UserManager';
import RtcManager from './rtc/RtcManager';
import * as fs from 'fs';
import SocketJWT from '~backend/SocketJWT';
import { prisma } from '~database';
import ClassroomManager, { Classroom } from './ClassroomManager';
import express from 'express';
import { DateTime, Duration } from 'luxon';
import { makeActivitySubmissionEntity } from '~api/entities/ActivitySubmissionEntity';
import { makeUserEntity } from '~api/entities/UserEntity';
import { hasScope } from '~backend/scopes';

dotenv.config();

let server;

console.debug = () => {};

const restApp = express();

if (process.env.USE_SSL_WEBSOCKET === 'true') {
    server = (await import('https')).createServer({
        key: fs.readFileSync(process.env.SSL_KEY as string),
        cert: fs.readFileSync(process.env.SSL_CERT as string)
    }, restApp);
}
else {
    server = (await import('http')).createServer(restApp);
}

const io: IOServer = new Server(server, {
    cors: {
        origin: process.env.WEBSOCKET_CORS_REGEX !== undefined
            ? RegExp(process.env.WEBSOCKET_CORS_REGEX.toString())
            : process.env.FRONTEND_ORIGIN,
        methods: ["GET", "POST"]
    }
});

const users = new UserManager();
const rtc = new RtcManager(io);
const classrooms = new ClassroomManager(io, prisma, users, rtc);

async function initialize() {
    // purge all live activities
    await prisma.liveActivity.deleteMany();
}

io.on('connection', socket => {
    let classroomId: string;
    let userId: string;
    let socketId = socket.id;
    let classroom: Classroom;
    let markClassroomSet: () => void;
    let classroomSetGate = new Promise<void>(resolve => markClassroomSet = resolve);

    async function connect() {
        console.log(userId, 'connected with id', socketId);

        users.add(socketId, userId);

        socket.join(classroomId);

        classroom = classrooms.getOrCreate(classroomId);
        markClassroomSet();
        
        io.to([...await classroom.getInstructors()]).emit('userJoin', userId);
        classroom.addMember(socketId);
    }

    async function disconnect() {
        if (socketId === undefined) {
            return;
        }
        
        console.log(socketId, 'disconnected!');
        users.delete(socketId);

        if (classroom) {
            classroom.removeMember(socket.id);
            const userId = users.get(socketId)?.userId;
            if (userId) {
                io.to([...await classroom.getInstructors()]).emit('userLeave', userId);
            }
        }
    }

    socket.on('join', async (jwt, callback) => {
        const jwtPrivateKey = await importJWK(JSON.parse(process.env.JWT_SIGNING_PRIVATE_KEY!));
        try {
            const result = await jwtVerify(jwt, jwtPrivateKey);

            if (result.payload.purpose === 'socket') {
                const jwtData = result.payload as unknown as SocketJWT;
                
                userId = jwtData.userId;
                classroomId = jwtData.classroomId;

                if (await hasScope(userId, 'activity:view', { classroomId })) {
                    connect();
                    return callback(true);
                }
                else {
                    // Connection invalid, let's kill it.
                    socket.disconnect();
                }
            }
        }
        catch (e) { }
        return callback(false);
    });

    socket.on('joinRtc', async () => {
        await classroomSetGate;
        
        // if (process.env.NODE_ENV === 'development') {
        //     // Works better with hot reload on the client
        //     classroom.activity?.networks.forEach(net => net.onUserLeave(socketId));
        // }
        classroom.activity?.networks.forEach(net => net.onUserJoin(socketId));
    });

    socket.on('disconnecting', reason => {
        disconnect();
    });

    socket.on('getParticipants', async (callback) => {
        await classroomSetGate;

        if (!await hasScope(userId, 'classroom:view', { classroomId })) {
            // request likely sent by accident or out of curiosity, just send nothing
            return callback([]);
        }

        const members = await classroom.getMembers();
        callback(members.map(x => users.get(x)?.userId).filter(isNotNull));
    });

    socket.on('signal', async (network, event, data, callback) => {
        await classroomSetGate;

        if (!classroom.activity) {
            return callback('No activity');
        }

        try {
            classroom.activity.networks[network]?.signal(socketId, event, data);
            callback();
        }
        catch (e) {
            if (e instanceof Error) {
                callback(e.message);
            }
            else {
                callback(`${e}`);
            }
        }
    });

    socket.on('submission', async (data, callback) => {
        await classroomSetGate;

        if (!classroom.activity) {
            return callback('No activity');
        }
        
        if (await hasScope(userId, 'activity:run', { classroomId })) {
            return callback('Instructors cannot make submissions');
        }

        if (!await hasScope(userId, 'submission:create', { classroomId })) {
            return callback('Something went wrong (missing submission:create scope)');
        }

        if (!('schemaVer' in data)) {
            return callback('Missing schemaVer field');
        }
        if (typeof data.schemaVer !== 'number') {
            return callback('schemaVer must be a number');
        }
        if (!('data' in data)) {
            return callback('Missing data field');
        }

        try {
            // It might seem like there could be a concurrency bug here,
            // but it's actually okay in practice since the version has a unique
            // constraint with respect to each user and activity.
            const lastSubmission = await prisma.activitySubmission.findFirst({
                where: {
                    activityId: classroom.activity.id,
                    userId
                },
                orderBy: {
                    version: 'desc'
                }
            });
            if (lastSubmission && DateTime.fromJSDate(lastSubmission.createdAt).diffNow().negate() < Duration.fromMillis(10000)) {
                return callback('Submissions can only be made every 10 seconds');
            }
            // TODO: Add check for size limits
            const submission = await prisma.activitySubmission.create({
                data: {
                    userId,
                    activityId: classroom.activity.id,
                    data,
                    version: (lastSubmission?.version ?? 0) + 1
                },
                include: { user: true }
            });

            callback();
            
            io.to(await classroom.getInstructors())
                .emit('submission', makeActivitySubmissionEntity(submission, {
                    user: makeUserEntity(submission.user)
                }));
        }
        catch (e) {
            // Most trying to add a submission with a version that already exists,
            // but it's possible that other database errors could occur.
            console.error(e);
            callback('An unexpected error occurred');
        }
    });
});

restApp.get('/', (_, res) => res.redirect(process.env.FRONTEND_ORIGIN!));

const internalApi = express();
restApp.use('/internal', internalApi);

internalApi.use(express.json());

internalApi.use(async (req, res, next) => {
    const jwt = req.headers.authorization;

    if (!jwt) {
        return res.status(403).send();
    }

    const jwtPrivateKey = await importJWK(JSON.parse(process.env.JWT_SIGNING_PRIVATE_KEY!));
    try {
        const result = await jwtVerify(jwt, jwtPrivateKey);

        if (result.payload.purpose === 'internal') {
            return next();
        }
    }
    catch (e) { }

    return res.status(403).send();
});

internalApi.post('/:classroomId/activity', async (req, res) => {
    const classroom = classrooms.getOrCreate(req.params.classroomId);
    const body: CreateLiveActivityInfo = req.body;
    
    try {
        await classroom.startActivity(body.id, body.networks, body.info);
        return res.status(200).send();
    }
    catch (e) {
        return res.status(400).send(e instanceof Error ? e.message : `${e}`);
    }

});

internalApi.delete('/:classroomId/activity', (req, res) => {
    console.log('ended activity');
    const classroom = classrooms.getOrCreate(req.params.classroomId);
    classroom.endActivity();
    res.status(200).send();
});

initialize();

server.listen(+process.env.WS_PORT!);

console.log("Started");
