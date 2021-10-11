import { Server, Socket } from 'socket.io';
import { AuthLevel, ClientToServerEventMap, eventAuthorization, ServerToClientEventMap, Username } from './types';
import jwtVerify from 'jose/jwt/verify';
import parseJwk from 'jose/jwk/parse';
import * as dotenv from 'dotenv';
import { $in, isNotNull } from '../src/util/typeguards';
import { Classroom } from './Classroom';
import Bimap from '../src/util/Bimap';
import { createServer } from 'http';
import tracked, { Tracked } from '../src/util/trackedEventEmitter';
import { nanoid } from 'nanoid';
import { createRing } from './ring';

dotenv.config()

const server = createServer();
server.listen(+process.env.WS_PORT!);

const io = new Server<ClientToServerEventMap, ServerToClientEventMap>(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

console.log("Started");

const usernameIdMap = new Bimap<Username, string>();
const classrooms = new Map<string, Classroom>();

function fromUsername(username: Username) {
    return usernameIdMap.getByKey(username);
}

function toUsername(socketId: string) {
    return usernameIdMap.getByValue(socketId);
}

io.on('connection', socket => {
    let authorizationLevel = AuthLevel.None;
    let classroom: Classroom;
    let myUsername: Username;
    
    function createClassroom(name: string) {
        const classroom = new Classroom(name);
        classroom.activity = { protocol: 'ring', ring: createRing(io, { fromUsername }) }
        classrooms.set(name, classroom);
        return classroom;
    }

    function connect(username: Username, roomId: string) {
        console.log(username, 'connected with id', socket.id);
        myUsername = username;
        usernameIdMap.set(username, socket.id);

        socket.join(roomId);
        classroom = classrooms.get(roomId)!;
        if (!classroom) {
            classroom = createClassroom(roomId);
        }
        io.to([...classroom.instructors]).emit('userJoin', username);
        classroom.users.add(socket.id);
        if (authorizationLevel >= AuthLevel.Instructor) {
            classroom.instructors.add(socket.id);
        }
        //dev
        classroom.activity!.ring.remove(myUsername);
        classroom.activity!.ring.add(myUsername);
    }

    function disconnect() {
        console.log(myUsername, 'diconnected!');
        usernameIdMap.deleteByValue(socket.id);

        if (classroom) {
            classroom.users.delete(socket.id);
            classroom.instructors.delete(socket.id);
            io.to([...classroom.instructors]).emit('userLeave', myUsername);
            //dev
            classroom.activity!.ring.remove(myUsername);
        }
    }

    socket.use(([ev], next) => {
        if ($in(ev, eventAuthorization)) {
            if (authorizationLevel >= eventAuthorization[ev]) {
                return next();
            }
            console.log(ev, 'not authorized');
            return next(new Error("Not authorized"));
        }
        console.log(ev, 'is not a vaid event');
        return next(new Error("Invalid Event"));
    });

    socket.on('join', async (jwt, callback) => {
        const jwtPrivateKey = await parseJwk(JSON.parse(process.env.JWT_SIGNING_PRIVATE_KEY!));
        try {
            const result = await jwtVerify(jwt, jwtPrivateKey);

            if (result.payload.purpose === 'rtc') {
                authorizationLevel = result.payload.authority as number;

                callback({
                    authority: result.payload.authority as AuthLevel,
                    user: result.payload.username as Username,
                    classroom: result.payload.classroom as string
                });
    
                connect(result.payload.username as Username, result.payload.classroom as string);
            }
            else {
                // It's a valid JWT, but it's not valid for connecting to the signaling server
                callback({ authority: AuthLevel.Denied });
            }
        }
        catch (e) {
            callback({ authority: AuthLevel.Denied });
        }
    });

    socket.on('disconnecting', reason => {
        disconnect();
    });

    socket.on('getParticipants', (callback) => {
        callback(Array.from(classroom.users, toUsername).filter(isNotNull));
        console.log('provided participants to', myUsername);
    });

    socket.on('linkRtc', (initiator, recipient, initiatorInfo, recipientInfo) => {
        const connId = nanoid();
        console.log(`[${connId}]`, 'link', initiator, 'with', recipient);

        const trackedSocket = tracked(socket);

        const initiatorId = fromUsername(initiator);
        if (!initiatorId) {
            console.log(`[${connId}]`, initiator, 'is not a valid user');
            return;
        }
        const recipientId = fromUsername(recipient);
        if (!recipientId) return;
        
        if (recipientId === socket.id) {
            console.log(`[${connId}]`, 'ignoring request to link', myUsername, 'to themselves');
            return;
        }

        const recipientUsername = toUsername(recipientId)!;

        io.to(initiatorId).emit('createWebRTCConnection', true, connId, initiatorInfo);
        console.log(`[${connId}]`, 'told', initiator, 'to initiate connection with', recipientUsername);
        
        const recipientSocket = io.sockets.sockets.get(recipientId);
        if (recipientSocket) {
            const trackedRecipientSocket = tracked(recipientSocket);
            
            trackedRecipientSocket.on('provideWebRTCSignal', (conn, signal) => {
                if (conn === connId) {
                    // console.log(`[${linkId}]`, 'signal from', recipientUsername, 'to', myUsername);
                    socket.emit('signalWebRTCConnection', connId, signal);
                }
            });

            trackedRecipientSocket.on('disconnect', () => {
                trackedRecipientSocket.offTracked();
            });
        }
        else {
            // recipient socket is on a different node.
            // We don't support this currently.
        }

        io.to(recipientId).emit('createWebRTCConnection', false, connId, recipientInfo);
        console.log(`[${connId}]`, 'told', recipient, 'to create connection with', initiator);

        trackedSocket.on('provideWebRTCSignal', (conn, signal) => {
            if (conn === connId) {
                io.to(recipientId).emit('signalWebRTCConnection', connId, signal);
            }
        });

        trackedSocket.on('unlinkRtc', (conn) => {
            if (conn === connId) {
                console.log(`[${connId}]`, 'unlink', myUsername, 'from', recipient);

                socket.emit('killWebRTCConnection', connId);
                io.to(recipientId).emit('killWebRTCConnection', connId);

                trackedSocket.offTracked();
            }
        });

        return connId;
    });

});
