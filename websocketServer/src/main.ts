import { Server } from 'socket.io';
import { AuthLevel, eventAuthorization, IOServer, Username } from './types';
import jwtVerify from 'jose/jwt/verify';
import parseJwk from 'jose/jwk/parse';
import * as dotenv from 'dotenv';
import { $in, isNotNull } from '../../src/util/typeguards';
import { Classroom } from './Classroom';
import { createServer } from 'http';
import { RingProtocol } from './rtc/protocols/RingProtocol';
import { stream } from '../../src/util/iterables/Stream';
import UserManager from './UserManager';
import RtcManager from './rtc/RtcManager';

dotenv.config()

const server = createServer();
server.listen(+process.env.WS_PORT!);

const io: IOServer = new Server(server, {
    cors: {
        origin: "*", // dev only
        methods: ["GET", "POST"]
    }
});

console.log("Started");

const users = new UserManager();
const rtc = new RtcManager(io, users);
const classrooms = new Map<string, Classroom>();

io.on('connection', socket => {
    let authorizationLevel = AuthLevel.None;
    let classroom: Classroom;
    let myUsername: Username;
    
    function createClassroom(name: string) {
        const classroom = new Classroom(name);
        classroom.activity = {
            protocol: new RingProtocol(
                stream(classroom.users).map(users.toUsername.bind(users)).filter((x): x is Username => x !== undefined),
                { rtc })
            };
        classrooms.set(name, classroom);
        return classroom;
    }

    function connect(username: Username, roomId: string) {
        console.log(username, 'connected with id', socket.id);
        myUsername = username;
        users.add(username, socket.id);

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
        classroom.activity?.protocol.onUserLeave(myUsername);
        classroom.activity?.protocol.onUserJoin(myUsername);
    }

    function disconnect() {
        console.log(myUsername, 'diconnected!');
        users.deleteById(socket.id);

        if (classroom) {
            classroom.users.delete(socket.id);
            classroom.instructors.delete(socket.id);
            io.to([...classroom.instructors]).emit('userLeave', myUsername);
            classroom.activity?.protocol.onUserLeave(myUsername);
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
        callback(Array.from(classroom.users, users.toUsername.bind(users)).filter(isNotNull));
        console.log('provided participants to', myUsername);
    });

});
