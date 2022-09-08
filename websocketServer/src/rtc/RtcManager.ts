import { nanoid } from "nanoid";
import tracked from "../../../src/util/trackedEventEmitter";
import { IOServer } from "../types";

export default class RtcManager {
    constructor(private io: IOServer) {

    }

    createWebRtcConnection(initiatorId: string, recipientId: string, initiatorInfo: unknown, recipientInfo: unknown) {
        const connId = nanoid();
        const initiatorName = initiatorId;
        const recipientName = recipientId;
        const initiatorConnId = connId + '/' + nanoid();
        const recipientConnId = connId + '/' + nanoid();
        console.log(`[${connId}]`, 'link', initiatorName, 'with', recipientName);
    
        if (!initiatorId) {
            console.log(`[${connId}]`, initiatorName, 'is not a valid user');
            throw new Error(`${initiatorName} is not a valid user`);
        }

        if (!recipientId) {
            console.log(`[${connId}]`, recipientName, 'is not a valid user');
            throw new Error(`${recipientName} is not a valid user`);
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
                console.log(`[${recipientConnId}] signal`);
            }
        });
        recipientSocket.on('provideWebRTCSignal', (conn, signal) => {
            if (conn === recipientConnId) {
                this.io.to(initiatorId).emit('signalWebRTCConnection', initiatorConnId, signal);
                console.log(`[${initiatorConnId}] signal`);
            }
        });
    
        initiatorSocket.on('disconnect', () => {
            initiatorSocket.offTracked();
        });
        recipientSocket.on('disconnect', () => {
            recipientSocket.offTracked();
        });
    
        this.io.to(initiatorId).emit('createWebRTCConnection', true, initiatorConnId, initiatorInfo);
        console.log(`[${connId}]`, 'told', initiatorName, 'to initiate connection with', recipientName);
        
        this.io.to(recipientId).emit('createWebRTCConnection', false, recipientConnId, recipientInfo);
        console.log(`[${connId}]`, 'told', recipientName, 'to create connection with', initiatorName);
    
        const self = this;

        return {
            connectionId: connId,
            alive: true,
            destroyWebRtcConnection() {
                if (!this.alive) {
                    throw new Error(`Cannot destroy already dead connection ${connId}`);
                }
                this.alive = false;
                console.log(`[${connId}]`, 'unlink', initiatorName, 'from', recipientName);
                self.io.to(initiatorId).emit('killWebRTCConnection', initiatorConnId);
                self.io.to(recipientId).emit('killWebRTCConnection', recipientConnId);
            }
        };
    }
}