import { ClassroomRole, SitewideRights } from '~database/src';
import { Iso8601Date } from '../../utils/src/iso8601';
import { ActivityEntity } from './entities/ActivityEntity';
import { ClassroomEntity, ClassroomEntityRefs } from './entities/ClassroomEntity';
import { ClassroomMemberEntity } from './entities/ClassroomMemberEntity';
import { LessonEntity, LessonEntityRefs } from './entities/LessonEntity';
import { UserEntity } from './entities/UserEntity';
import { PolicyConfiguration } from './RtcNetwork';
import { PaginationParams } from './standardParams';

type MethodObject<T> = { [method in 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE']?: T };

interface ComplexEndpointHandle<Methods extends MethodObject<{ body: any, response: any }>> {
    __methodsTypeBrand?: Methods;
    readonly _path: string;
}

type EndpointHandle<Response, Bodies extends MethodObject<any> = { GET: undefined }> = ComplexEndpointHandle<
    { [M in keyof Bodies]: { body: Bodies[M], response: M extends 'DELETE' ? undefined : Response } }
>;


function paramsToQuery(params: { [name: string]: string | number | boolean }) {
    return Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join('&');
}

function inclusions(includes: { [name in string]?: boolean } = {}) {
    return Object.keys(includes).filter(k => includes[k]).map(k => `include=${k}`).join('&');
}

type Inclusions<T extends string, Overrides extends T[] | false = false> = Overrides extends T[] ? ({
    [K in T as K extends Overrides[number] ? K : never]: true
} & {
    [K in T as K extends Overrides[number] ? never : K]?: false
}) : {
    [K in T]?: boolean
};

class LessonApi<Refs extends LessonEntityRefs> implements EndpointHandle<
    LessonEntity<Refs>,
    {
        GET: undefined,
        PATCH: {
            displayName?: string,
        },
        DELETE: undefined,
    }
> {
    constructor(private base: string, private include?: Inclusions<'classroom' | 'activities'>) {}

    get _path() { return `${this.base}?${inclusions(this.include)}` };

    move(params: { merge: 'replace' | 'combine' }): EndpointHandle<LessonEntity<Refs>, {
        PATCH: {
            date: Iso8601Date,
            displayName?: string,
        },
    }> {
        return { _path: `${this._path}&${paramsToQuery(params)}` };
    }

    get activities() {
        return {
            all: { _path: `${this.base}/activity` } as EndpointHandle<ActivityEntity<{ lesson: 'none' }>[]>,
            create: { _path: `${this.base}/activity` } as EndpointHandle<ActivityEntity<{ lesson: 'none' }>, {
                POST: {
                    activityType: string,
                    displayName: string,
                    configuration?: any,
                    enabledLanguages?: string[],
                },
            }>
        };
    }
}

class ClassroomApi<Refs extends ClassroomEntityRefs> implements EndpointHandle<ClassroomEntity<Refs>> {
    constructor(private base: string, private include?: Inclusions<'members' | 'lessons'>) {}
    
    get _path() { return `${this.base}?${inclusions(this.include)}` };

    get joinCode(): ComplexEndpointHandle<{
        POST: { body: undefined, response: string },
        DELETE: { body: undefined, response: undefined },
    }> { return { _path: `${this.base}/join-code` } };

    me(include: Inclusions<'classroom' | 'classes', ['classroom']>): EndpointHandle<ClassroomMemberEntity<{ classroom: 'deep', classes: 'none' }>>;
    me(include: Inclusions<'classroom' | 'classes', ['classes']>): EndpointHandle<ClassroomMemberEntity<{ classroom: 'shallow', classes: 'deep' }>>;
    me(include: Inclusions<'classroom' | 'classes', ['classroom' | 'classes']>): EndpointHandle<ClassroomMemberEntity<{ classroom: 'deep', classes: 'deep' }>>;
    me(include?: Inclusions<'classroom' | 'classes'>): EndpointHandle<ClassroomMemberEntity<{ classroom: 'shallow', classes: 'none' }>>;
    me(include?: Inclusions<'classroom' | 'classes'>): EndpointHandle<ClassroomMemberEntity> {
        return { _path: `${this.base}/me?${inclusions(include)}` };
    }

    get members() {
        return {
            all: { _path: `${this.base}/members` } as EndpointHandle<ClassroomMemberEntity<{ classroom: 'none', classes: 'none' }>[]>,
        };
    };

    member(id: string): EndpointHandle<ClassroomMemberEntity<{ classroom: 'shallow', classes: 'shallow' }>, {
        GET: undefined,
        PATCH: {
            role?: ClassroomRole,
        },
        DELETE: undefined,
    }> {
        return { _path: `${this.base}/members/${id}` };
    }

    lessons(include: Inclusions<'activities', ['activities']>): EndpointHandle<LessonEntity<{ activities: 'deep', classroom: 'none' }>>;
    lessons(include?: Inclusions<'activities'>): EndpointHandle<LessonEntity<{ activities: 'shallow', classroom: 'none' }>>;
    lessons(include?: Inclusions<'activities'>): EndpointHandle<LessonEntity> {
        return { _path: `${this.base}/lesson?${inclusions(include)}` };
    }

    lesson(id: string, include: Inclusions<'classroom' | 'activities', ['classroom']>): LessonApi<{ classroom: 'deep', activities: 'shallow' }>;
    lesson(id: string, include: Inclusions<'classroom' | 'activities', ['activities']>): LessonApi<{ classroom: 'shallow', activities: 'deep' }>;
    lesson(id: string, include: Inclusions<'classroom' | 'activities', ['classroom' | 'activities']>): LessonApi<{ classroom: 'deep', activities: 'deep' }>;
    lesson(id: string, include?: Inclusions<'classroom' | 'activities'>): LessonApi<{ classroom: 'shallow', activities: 'shallow' }>;
    lesson(id: string, include?: Inclusions<'classroom' | 'activities'>) {
        return new LessonApi(`${this.base}/lesson/${id}`, include);
    }

    get activities() {
        return {
            live: { _path: `${this._path}/activity/live` } as ComplexEndpointHandle<{
                GET: { body: undefined, response: {
                    live: boolean,
                    server: string,
                    token: string,
                } },
                POST: {
                    body: {
                        id: string,
                        networks?: PolicyConfiguration[],
                    },
                    response: undefined,
                },
                DELETE: { body: undefined, response: undefined },
            }>,
            ice: { _path: `${this._path}/activity/ice` } as EndpointHandle<RTCIceServer[]>,
        };
    }
}

class UsersApi implements EndpointHandle<UserEntity, {
    GET: undefined,
    PATCH: {
        displayName?: string,
        email?: string,
        firstName?: string,
        lastName?: string,
        rights?: SitewideRights,
    },
    DELETE: undefined,
}> {
    constructor(private base: string) {}

    get _path() { return this.base };
}

const api = new class Api {
    me(include: Inclusions<'classes' | 'simulatedUsers', ['classes']>): EndpointHandle<UserEntity<{ classes: 'deep', simulatedUsers: 'none' }>>;
    me(include: Inclusions<'classes' | 'simulatedUsers', ['simulatedUsers']>): EndpointHandle<UserEntity<{ classes: 'shallow', simulatedUsers: 'deep' }>>;
    me(include: Inclusions<'classes' | 'simulatedUsers', ['classes' | 'simulatedUsers']>): EndpointHandle<UserEntity<{ classes: 'deep', simulatedUsers: 'deep' }>>;
    me(include?: Inclusions<'classes' | 'simulatedUsers'>): EndpointHandle<UserEntity<{ classes: 'shallow', simulatedUsers: 'none' }>>;
    me(include?: Inclusions<'classes' | 'simulatedUsers'>): EndpointHandle<UserEntity> {
        return { _path: `/api/me?${inclusions(include)}` };
    }

    classroom(id: string, include: Inclusions<'members' | 'lessons', ['members']>): ClassroomApi<{ members: 'deep', lessons: 'none' }>;
    classroom(id: string, include: Inclusions<'members' | 'lessons', ['lessons']>): ClassroomApi<{ members: 'none', lessons: 'deep' }>;
    classroom(id: string, include: Inclusions<'members' | 'lessons', ['members' | 'lessons']>): ClassroomApi<{ members: 'deep', lessons: 'deep' }>;
    classroom(id: string, include?: Inclusions<'members' | 'lessons'>): ClassroomApi<{ members: 'none', lessons: 'none' }>;
    classroom(id: string, include?: Inclusions<'members' | 'lessons'>) {
        return new ClassroomApi(`/api/classroom/${id}`, include);
    }

    classrooms = {
        create: { _path: '/api/classroom' } as EndpointHandle<ClassroomEntity<{ members: 'shallow', lessons: 'none' }>, {
            POST: { displayName: string },
        }>,
        join: { _path: '/api/classroom/join' } as EndpointHandle<ClassroomEntity<{ members: 'none', lessons: 'none' }>, { POST: { code: string } }>,
    };

    user(id: string) {
        return new UsersApi(`/api/users/${id}`);
    }

    users = {
        all(params: PaginationParams & { includeSimulated?: boolean } = {}): EndpointHandle<UserEntity<{ classes: 'none', simulatedUsers: 'none' }>> {
            return { _path: `/api/users?${paramsToQuery(params)}` };
        },
        createSimulated: { _path: `/api/users/simulated` } as EndpointHandle<UserEntity<{ classes: 'none', simulatedUsers: 'none' }>, {
            POST: {
                username: string,
                displayName: string,
                email: string,
                firstName: string,
                lastName: string,
                rights: SitewideRights,
            },
        }>,
    };
};

export default api;