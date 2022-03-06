import { Server } from 'socket.io';
import { IOServer, LiveActivityInfo } from './types';
import jwtVerify from 'jose/jwt/verify';
import parseJwk from 'jose/jwk/parse';
import * as dotenv from 'dotenv';
import { isNotNull } from '../../src/util/typeguards';
import UserManager from './UserManager';
import RtcManager from './rtc/RtcManager';
import * as fs from 'fs';
import SocketJWT from '../../src/api/server/SocketJWT';
import { PrismaClient } from '.prisma/client';
import ClassroomManager, { Classroom } from './ClassroomManager';
import * as express from 'express';
import { DateTime, Duration } from 'luxon';
import { makeActivitySubmissionEntity } from '../../src/api/entities/ActivitySubmissionEntity';
import { makeUserEntity } from '../../src/api/entities/UserEntity';
import allPolicies from './rtc/policies/allPolicies';
import { RtcCoordinator } from './rtc/policies/RtcPolicy';
import { hasScope } from '../../src/api/server/scopes';

dotenv.config()

const prisma = new PrismaClient();

let server;

const restApp = express();
if (process.env.USE_SSL_WEBSOCKET) {
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
        // Trim trailing slash
        origin: process.env.FRONTEND_ORIGIN!.replace(/\/$/, ''),
        methods: ["GET", "POST"]
    }
});

const users = new UserManager();
const rtc = new RtcManager(io);
const classrooms = new ClassroomManager(io, prisma, users);

async function initialize() {
    // purge all live activities
    await prisma.liveActivity.deleteMany();
}

io.on('connection', socket => {
    let classroomId: string;
    let userId: string;
    let socketId = socket.id;
    let classroom: Classroom;

    async function connect() {
        console.log(userId, 'connected to with id', socketId);

        users.add(socketId, userId);

        socket.join(classroomId);

        classroom = classrooms.getOrCreate(classroomId);

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
        const jwtPrivateKey = await parseJwk(JSON.parse(process.env.JWT_SIGNING_PRIVATE_KEY!));
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
            }
        }
        catch (e) { }
        return callback(false);
    });

    socket.on('joinRtc', async () => {
        if (classroom.activity?.rtcPolicy) {
            classroom.activity.rtcPolicy.onUserLeave(socketId);
            classroom.activity.rtcPolicy.onUserJoin(socketId);
        }
    });

    socket.on('disconnecting', reason => {
        disconnect();
    });

    socket.on('getParticipants', async (callback) => {
        if (!await hasScope(userId, 'classroom:view', { classroomId })) {
            // request likely sent by accident or out of curiosity, just send nothing
            return callback([]);
        }

        const members = await classroom.getMembers();
        callback(members.map(x => users.get(x)?.userId).filter(isNotNull));
    });

    socket.on('command', async (to, data, callback) => {
        if (await hasScope(userId, 'activity:run', { classroomId })) {
            if (to === undefined) {
                to = [...classroom.membersCache];
            }
            if (to.length > 0) {
                io.to(to.filter(x => x !== socketId))
                    .emit('command', data);
            }
            return callback();
        }
        return callback('An unexpected error occurred');
    });

    socket.on('request', async (data, callback) => {
        if (await hasScope(userId, 'activity:view', { classroomId })) {
            io.to([...classroom.instructorsCache])
                .emit('request', data);
            return callback();
        }
        return callback('An unexpected error occurred');
    });

    socket.on('submission', async (data, callback) => {
        if (!classroom.activity) {
            return callback('No activity');
        }
        
        if (await hasScope(userId, 'activity:run', { classroomId })) {
            return callback('Instructors cannot make submissions');
        }

        if (!await hasScope(userId, 'submissions:create', { classroomId })) {
            return callback('Something went wrong (missing submissions:create scope)');
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

    const jwtPrivateKey = await parseJwk(JSON.parse(process.env.JWT_SIGNING_PRIVATE_KEY!));
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
    const body: LiveActivityInfo = req.body;

    const policyConstructor = allPolicies.find(x => x.policyId === body.rtcPolicy);
    
    classroom.startActivity(body.id, body.info, policyConstructor ? new policyConstructor(await classroom.getMembers(), { rtc }) : undefined);

    res.status(200).send();
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
