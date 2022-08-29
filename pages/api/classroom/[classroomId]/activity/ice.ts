import { Status } from '../../../../../src/api/Endpoint';
import { hasScope } from '../../../../../src/api/server/scopes';
import { createHmac } from 'crypto';
import { resource } from '../../../../../src/api/resource';

const apiActivityIce = resource(['classroomId'] as const)<RTCIceServer[]>()
    .get({ auth: true }, async ({ session, query: { classroomId } }, ok, fail) => {
        if (!await hasScope(session!.user.id, 'activity:view', { classroomId })) {
            return fail(Status.FORBIDDEN);
        }

        const iceServers: RTCIceServer[] = [];

        if (process.env.WEBRTC_STUN_SERVER_URL) {
            iceServers.push({
                urls: process.env.WEBRTC_STUN_SERVER_URL,
            });
        }
        else {
            iceServers.push(
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478?transport=udp' },
            );
        }

        if (process.env.WEBRTC_TURN_SERVER_URL && process.env.WEBRTC_TURN_SECRET) {
            const expirationDate = Date.now() / 1000 + 60 * 60 * 2; // 2 hours
            const username = `${expirationDate}:${session?.user.username}`;
            const password = createHmac('sha1', process.env.WEBRTC_TURN_SECRET)
                .update(username)
                .digest()
                .toString('base64');
            
            iceServers.push({
                urls: process.env.WEBRTC_TURN_SERVER_URL,
                credentialType: 'password',
                username,
                credential: password,
            })
        }

        return ok(iceServers);
    })
    .build();

export default apiActivityIce;