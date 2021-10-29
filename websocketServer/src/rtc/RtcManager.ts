import { nanoid } from "nanoid";
import tracked from "../../../src/util/trackedEventEmitter";
import { IOServer, Username } from "../types";
import UserManager from "../UserManager";

export default class RtcManager {
    constructor(private io: IOServer, private users: UserManager) {

    }

    createWebRtcConnection(initiator: Username, recipient: Username, initiatorInfo: unknown, recipientInfo: unknown) {
        const connId = nanoid();
        const initiatorConnId = connId + '/' + nanoid();
        const recipientConnId = connId + '/' + nanoid();
        console.log(`[${connId}]`, 'link', initiator, 'with', recipient);
    
        const initiatorId = this.users.fromUsername(initiator);
        if (!initiatorId) {
            console.log(`[${connId}]`, initiator, 'is not a valid user');
            throw new Error(`${initiator} is not a valid user`);
        }
        const recipientId = this.users.fromUsername(recipient);
        if (!recipientId) {
            console.log(`[${connId}]`, recipient, 'is not a valid user');
            throw new Error(`${recipient} is not a valid user`);
        }
        
        const initiatorSocket = tracked(this.io.sockets.sockets.get(initiatorId));
        const recipientSocket = tracked(this.io.sockets.sockets.get(recipientId));
    
        if (!initiatorSocket || !recipientSocket) {
            // Socket is on a different node.
            // We don't support this currently.
            throw new Error(`Using multiple Socket.IO nodes is not supported`);
        }
        
        initiatorSocket.on('provideWebRTCSignal', (conn, signal) => {
            if (conn === initiatorConnId) {
                this.io.to(recipientId).emit('signalWebRTCConnection', recipientConnId, signal);
            }
        });
        recipientSocket.on('provideWebRTCSignal', (conn, signal) => {
            if (conn === recipientConnId) {
                this.io.to(initiatorId).emit('signalWebRTCConnection', initiatorConnId, signal);
            }
        });
    
        initiatorSocket.on('disconnect', () => {
            initiatorSocket.offTracked();
        });
        recipientSocket.on('disconnect', () => {
            recipientSocket.offTracked();
        });
    
        this.io.to(initiatorId).emit('createWebRTCConnection', true, initiatorConnId, initiatorInfo);
        console.log(`[${connId}]`, 'told', initiator, 'to initiate connection with', recipient);
        
        this.io.to(recipientId).emit('createWebRTCConnection', false, recipientConnId, recipientInfo);
        console.log(`[${connId}]`, 'told', recipient, 'to create connection with', initiator);
    
        const self = this;

        return {
            connectionId: connId,
            alive: true,
            destroyWebRtcConnection() {
                if (!this.alive) {
                    throw new Error(`Cannot destroy already dead connection ${connId}`);
                }
                this.alive = false;
                console.log(`[${connId}]`, 'unlink', initiator, 'from', recipient);
                self.io.to(initiatorId).emit('killWebRTCConnection', initiatorConnId);
                self.io.to(recipientId).emit('killWebRTCConnection', recipientConnId);
            }
        };
    }
}