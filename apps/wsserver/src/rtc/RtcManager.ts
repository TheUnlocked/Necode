import { nanoid } from "nanoid";
import { NetworkId } from '~api/RtcNetwork';
import tracked from "~shared/trackedEventEmitter";
import { IOServer } from "~api/ws";

export default class RtcManager {
    constructor(private io: IOServer) {

    }

    createWebRtcConnection(network: NetworkId, initiatorId: string, recipientId: string) {
        const connId = nanoid();
        const initiatorName = initiatorId;
        const recipientName = recipientId;
        const initiatorConnId = connId + '/' + nanoid();
        const recipientConnId = connId + '/' + nanoid();
        console.debug(`[${connId}]`, 'link', initiatorName, 'with', recipientName);
    
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
            // Either a socket has been disconnected very recently,
            // or a socket is on a different node which we don't support this currently.
            console.warn(`Tried to create RTC connection with unknown socket`);
            return {
                connectionId: connId,
                alive: false,
                destroyWebRtcConnection() {},
            };
        }
        
        initiatorSocket.on('provideWebRTCSignal', (conn, signal) => {
            if (conn === initiatorConnId) {
                this.io.to(recipientId).emit('signalWebRTCConnection', recipientConnId, signal);
                console.debug(`[${recipientConnId}] signal`);
            }
        });
        recipientSocket.on('provideWebRTCSignal', (conn, signal) => {
            if (conn === recipientConnId) {
                this.io.to(initiatorId).emit('signalWebRTCConnection', initiatorConnId, signal);
                console.debug(`[${initiatorConnId}] signal`);
            }
        });
    
        initiatorSocket.on('disconnect', () => {
            initiatorSocket.offTracked();
        });
        recipientSocket.on('disconnect', () => {
            recipientSocket.offTracked();
        });
    
        this.io.to(initiatorId).emit('createWebRTCConnection', network, true, initiatorConnId, {
            displayName: recipientName,
        });
        console.debug(`[${connId}]`, 'told', initiatorName, 'to initiate connection with', recipientName);
        
        this.io.to(recipientId).emit('createWebRTCConnection', network, false, recipientConnId, {
            displayName: initiatorName,
        });
        console.debug(`[${connId}]`, 'told', recipientName, 'to create connection with', initiatorName);
    
        const self = this;

        return {
            connectionId: connId,
            alive: true,
            destroyWebRtcConnection() {
                if (!this.alive) {
                    throw new Error(`Cannot destroy already dead connection ${connId}`);
                }
                this.alive = false;
                console.debug(`[${connId}]`, 'unlink', initiatorName, 'from', recipientName);
                self.io.to(initiatorId).emit('killWebRTCConnection', initiatorConnId);
                self.io.to(recipientId).emit('killWebRTCConnection', recipientConnId);
            }
        };
    }
}