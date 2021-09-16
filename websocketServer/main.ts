import { Server } from 'socket.io';
import { AuthLevel, ClientToServerEventMap, eventAuthorization, ServerToClientEventMap } from './types';
import jwtVerify from 'jose/jwt/verify';
import parseJwk from 'jose/jwk/parse';
import dotenv from 'dotenv';
import { $in } from '../src/util/typeguards';

dotenv.config()

const io = new Server<ClientToServerEventMap, ServerToClientEventMap>(+process.env.WS_PORT!);

io.on('connection', socket => {
    let authorizationLevel = AuthLevel.None;
    
    socket.on('join', async jwt => {
        const jwtPrivateKey = await parseJwk(JSON.parse(process.env.JWT_SIGNING_PRIVATE_KEY!));
        try {
            const result = await jwtVerify(jwt, jwtPrivateKey);
            socket.emit('authorization', result.payload.authority as number);
        }
        catch (e) {
            socket.emit('authorization', AuthLevel.Denied);
        }
    });

    socket.use(([ev], next) => {
        if ($in(ev, eventAuthorization)) {
            if (authorizationLevel > eventAuthorization[ev]) {
                return next();
            }
            return next(new Error("Not authorized"));
        }
        return next(new Error("Invalid Event"));
    });
});
