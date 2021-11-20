import { Server } from 'socket.io';
import { IOServer } from './types';
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
        origin: "*", // dev only
        methods: ["GET", "POST"]
    }
});

const users = new UserManager();
const rtc = new RtcManager(io);
const classrooms = new ClassroomManager(io, prisma, users);

function initialize() {
    // purge all live activities
    prisma.liveActivity.deleteMany();
}

io.on('connection', socket => {
    let classroomId: string;
    let userId: string;
    let socketId = socket.id;
    let classroom: Classroom;

    async function getRoleInClass() {
        return (await prisma.classroomMembership.findFirst({
            where: { classroomId, userId },
            select: { role: true }
        }))?.role;
    }

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
        
        console.log(socketId, 'diconnected!');
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

                if (await getRoleInClass() !== undefined) {
                    connect();
                    return callback(true);
                }
            }
        }
        catch (e) { }
        return callback(false);
    });

    socket.on('disconnecting', reason => {
        disconnect();
    });

    socket.on('getParticipants', async (callback) => {
        const role = await getRoleInClass();
        if (!role) {
            // this request is complete garbage, forcefully disconnect
            return socket.disconnect();
        }
        else if (role !== 'Instructor') {
            // request likely sent by accident or out of curiosity, just send nothing
            return callback([]);
        }

        const members = await classroom.getMembers();
        callback(members.map(x => users.get(x)?.userId).filter(isNotNull));
    });

    socket.on('command', async (to, data) => {

    });

    socket.on('request', async (data) => {

    });
});

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

internalApi.post('/:classroomId/activity', (req, res) => {
    const classroom = classrooms.getOrCreate(req.params.classroomId);
    classroom.startActivity(req.body.id, req.body.data);
    res.status(200).send();
});

internalApi.delete('/:classroomId/activity', (req, res) => {
    const classroom = classrooms.getOrCreate(req.params.classroomId);
    classroom.endActivity();
    res.status(200).send();
});

initialize();

server.listen(+process.env.WS_PORT!);

console.log("Started");
