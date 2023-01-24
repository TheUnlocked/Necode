import { PrismaClient } from "database";
import { NetworkId, PolicyConfiguration } from '../../src/api/RtcNetwork';
import { stream } from "common/util/iterables/Stream";
import { isNotNull } from "common/util/typeguards";
import RtcManager from './rtc/RtcManager';
import { RtcNetwork } from './rtc/RtcNetwork';
import { IOServer } from "./types";
import UserManager from "./UserManager";

function toNetworkId(x: number) {
    switch (x) {
        case 0:
            return NetworkId.NET_0;
        case 1:
            return NetworkId.NET_1;
    }
    throw new Error(`There is no network with id ${x}`);
}

class Classroom {
    private memberSocketIds = new Set<string>();

    private _activity?: Activity;

    constructor(public readonly id: string, private io: IOServer, private prisma: PrismaClient, private users: UserManager, private rtc: RtcManager) {

    }

    get activity() {
        return this._activity;
    }

    startActivity(activityId: string, networkConfig: readonly PolicyConfiguration[], activityInfo: any) {
        this._activity = {
            id: activityId,
            info: activityInfo,
            networks: networkConfig.map((config, i) => new RtcNetwork(toNetworkId(i), this.rtc, config)),
        };
        this.io.to(this.id).emit('startActivity', { id: activityId, info: activityInfo });
    }

    endActivity() {
        this._activity = undefined;
        this.io.to(this.id).emit('endActivity');
    }

    addMember(socketId: string) {
        this.memberSocketIds.add(socketId);
        
        if (this.activity) {
            this.io.to(socketId).emit('startActivity', { id: this.activity.id, info: this.activity.info });
        }
        else {
            this.io.to(socketId).emit('endActivity');
        }
    }

    removeMember(socketId: string) {
        this.memberSocketIds.delete(socketId);
        this._instructorsCache.delete(socketId);

        this.activity?.networks.forEach(network => network.onUserLeave(socketId));
    }

    private async getMembersFromQueryResult(query: () => Promise<{ userId: string }[]>) {
        const partitionedMembers
            = [...stream(this.memberSocketIds)
                .partition(x => this.users.get(x)?.userId)];
        
        for (const member of partitionedMembers.find(x => x[0] === undefined)?.[1] ?? []) {
            this.memberSocketIds.delete(member);
        }
            
        const backwardsUserTable = Object.fromEntries(
            partitionedMembers.filter((x): x is [string, string[]] => x[0] !== undefined)
        );

        return (await query()).flatMap(x => backwardsUserTable[x.userId]);
    }

    get membersCache() {
        return this.memberSocketIds as ReadonlySet<string>;
    }

    async getMembers() {
        return this.getMembersFromQueryResult(() =>
            this.prisma.classroomMembership.findMany({
                where: {
                    classroomId: this.id,
                    userId: {
                        in: [...this.memberSocketIds]
                            .map(x => this.users.get(x)?.userId)
                            .filter(isNotNull)
                    }
                },
                select: { userId: true }
            })
        );
    }

    private _instructorsCache = new Set();
    get instructorsCache() {
        return this._instructorsCache as ReadonlySet<string>;
    }

    async getInstructors() {
        const instructors = await this.getMembersFromQueryResult(() =>
            this.prisma.classroomMembership.findMany({
                where: {
                    classroomId: this.id,
                    userId: {
                        in: [...this.memberSocketIds]
                            .map(x => this.users.get(x)?.userId)
                            .filter(isNotNull)
                    },
                    role: 'Instructor'
                },
                select: { userId: true }
            })
        );

        this._instructorsCache = new Set(instructors);
        return instructors;
    }
}

export type { Classroom };

export interface Activity {
    id: string;
    info: any;
    networks: readonly RtcNetwork[];
}

export default class ClassroomManager {
    private map = new Map<string, Classroom>();

    constructor(private io: IOServer, private prisma: PrismaClient, private users: UserManager, private rtc: RtcManager) {

    }

    get(id: string) {
        return this.map.get(id);
    }

    getOrCreate(id: string) {
        if (!this.map.has(id)) {
            const classroom = new Classroom(id, this.io, this.prisma, this.users, this.rtc);
            this.map.set(id, classroom);
            return classroom;
        }
        return this.map.get(id)!;
    }

    delete(id: string) {
        return this.map.delete(id);
    }
}