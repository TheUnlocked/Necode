import { Server } from 'socket.io';
import { AuthLevel, ClientToServerEventMap, eventAuthorization, ServerToClientEventMap, Username } from './types';
import jwtVerify from 'jose/jwt/verify';
import parseJwk from 'jose/jwk/parse';
import * as dotenv from 'dotenv';
import { $in, isNotNull } from '../src/util/typeguards';
import { Classroom } from './Classroom';
import Bimap from '../src/util/Bimap';
import { createServer } from 'http';

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
        classrooms.set(name, classroom);
        return classroom;
    }

    function connect(username: Username, roomId: string) {
        console.log(username, 'connected with id');
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
    }

    function disconnect() {
        console.log(myUsername, 'diconnected!');
        usernameIdMap.deleteByValue(socket.id);

        if (classroom) {
            classroom.users.delete(socket.id);
            classroom.instructors.delete(socket.id);
            io.to([...classroom.instructors]).emit('userLeave', myUsername);
        }
    }

    socket.use(([ev], next) => {
        if ($in(ev, eventAuthorization)) {
            if (authorizationLevel >= eventAuthorization[ev]) {
                return next();
            }
            console.log(ev, 'not authorized');
            return;
            return next(new Error("Not authorized"));
        }
        console.log(ev, 'is not a vaid event');
        return;
        return next(new Error("Invalid Event"));
    });

    socket.on('join', async jwt => {
        const jwtPrivateKey = await parseJwk(JSON.parse(process.env.JWT_SIGNING_PRIVATE_KEY!));
        try {
            const result = await jwtVerify(jwt, jwtPrivateKey);

            if (result.payload.purpose === 'rtc') {
                authorizationLevel = result.payload.authority as number;
                socket.emit(
                    'grantAuthorization',
                    result.payload.authority as number,
                    result.payload.username as Username,
                    result.payload.classroom as string
                );
    
                connect(result.payload.username as Username, result.payload.classroom as string);
            }
            else {
                // It's a valid JWT, but it's not valid for connecting to the signaling server
                socket.emit('grantAuthorization', AuthLevel.Denied, null!, null!);
            }
        }
        catch (e) {
            socket.emit('grantAuthorization', AuthLevel.Denied, null!, null!);
        }
    });

    socket.on('disconnect', reason => {
        disconnect();
    });

    socket.on('getParticipants', () => {
        socket.emit('provideParticipants', Array.from(classroom.users, toUsername).filter(isNotNull));
        console.log('provided participants to', myUsername);
    });

    socket.on('linkParticipants', (initiator, participants, initiatorInfo, participantInfo) => {
        console.log('link', initiator, 'with', participants.join(', '));

        const initiatorId = fromUsername(initiator);
        if (!initiatorId) {
            console.log(initiator, 'is not a valid user');
            return;
        }
        const participantIds = participants.map(fromUsername).filter((x): x is string => x as any as boolean);
        if (participantIds.length === 0) return;
        
        for (const participantId of participantIds) {
            const participantUsername = toUsername(participantId)!;

            io.to(initiatorId).emit('createWebRTCConnection', true, participantUsername, initiatorInfo);
            console.log('told', initiator, 'to initiate connection with', participantUsername);
            
            const participantSocket = io.sockets.sockets.get(participantId);
            if (participantSocket) {
                participantSocket.on('provideWebRTCSignal', (user, signal) => {
                    if (fromUsername(user) === socket.id) {
                        console.log('signal from', participantUsername, 'to', myUsername);
                        socket.emit('signalWebRTCConnection', participantUsername, signal);
                    }
                });
            }
            else {
                // Participant socket is on a different node.
                // We don't support this currently.
            }
        }
        io.to(participantIds).emit('createWebRTCConnection', false, initiator, participantInfo);
        console.log('told', participants.join(', '), 'to create connection with', initiator);

        socket.on('provideWebRTCSignal', (user, signal) => {
            console.log('signal from', myUsername, 'to', user);
            if (participants.includes(user)) {
                io.to(fromUsername(user)!).emit('signalWebRTCConnection', myUsername, signal);
            }
        });
    });

});
