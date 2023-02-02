import { ClassroomRole, SitewideRights } from '~database/src';
import { Iso8601Date } from '~utils/iso8601';
import { ActivityEntity, ActivityEntityRefs } from './entities/ActivityEntity';
import { ActivitySubmissionEntity } from './entities/ActivitySubmissionEntity';
import { ClassroomEntity, ClassroomEntityRefs } from './entities/ClassroomEntity';
import { ClassroomMemberEntity } from './entities/ClassroomMemberEntity';
import { LessonEntity, LessonEntityRefs } from './entities/LessonEntity';
import { UserEntity } from './entities/UserEntity';
import { PolicyConfiguration } from './RtcNetwork';
import { PaginationParams } from './standardParams';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type MethodObject<T> = { [method in HttpMethod]?: T };
type x = UsersApi extends SimpleEndpointHandle<infer B> ? B : -1;
export interface EndpointHandle<Methods extends MethodObject<{ body: any, response: any }>> {
    readonly __methodsTypeBrand?: Methods;
    readonly _path: string;
    readonly _imm?: boolean;
}

abstract class AbstractEndpointHandle<Methods extends MethodObject<{ body: any, response: any }>> implements EndpointHandle<Methods> {
    __methodsTypeBrand?: Methods;
    _imm?: boolean;
    abstract _path: string;
}

abstract class SimpleEndpointHandle<Response, Bodies extends MethodObject<any> = { GET: undefined }> implements EndpointHandle<{ [M in keyof Bodies]: { body: Bodies[M], response: M extends 'DELETE' ? undefined : Response } }> {
    __methodsTypeBrand?: { [M in keyof Bodies]: { body: Bodies[M]; response: M extends 'DELETE' ? undefined : Response } };
    _imm?: boolean;
    abstract _path: string;
}

function paramsToQuery(params: { [name: string]: string | number | boolean | undefined }) {
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

class LessonApi<Refs extends LessonEntityRefs> extends SimpleEndpointHandle<
    LessonEntity<Refs>,
    {
        GET: undefined,
        PATCH: {
            displayName?: string,
        },
        DELETE: undefined,
    }
> {
    constructor(private base: string, private include?: Inclusions<'classroom' | 'activities'>) { super() }

    get _path() { return `${this.base}?${inclusions(this.include)}` };

    move(params: { merge: 'replace' | 'combine' }): SimpleEndpointHandle<LessonEntity<Refs>, {
        PATCH: {
            date: Iso8601Date,
            displayName?: string,
        },
    }> {
        return { _path: `${this._path}&${paramsToQuery(params)}` };
    }

    get activities() {
        return {
            all: { _path: `${this.base}/activity` } as SimpleEndpointHandle<ActivityEntity<{ lesson: 'none' }>[]>,
            create: { _path: `${this.base}/activity` } as SimpleEndpointHandle<ActivityEntity<{ lesson: 'none' }>, {
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

type SubmissionsParams<T extends ('user' | 'activity')[] | false = false> = {
    userId?: string;
    version?: number | 'all' | 'latest';
} & (T extends false
    ? { include?: Inclusions<'user' | 'activity'> }
    : { include: Inclusions<'user' | 'activity', T> });

class ActivityApi<Refs extends ActivityEntityRefs> extends SimpleEndpointHandle<ActivityEntity<Refs>> {
    constructor(private classroomBase: string, private id: string, private includes?: Inclusions<'lesson'>) { super() }

    get _path() { return `${this.classroomBase}/activity/${this.id}?${inclusions(this.includes)}` }

    submissions(params: SubmissionsParams<['user']>): SimpleEndpointHandle<ActivitySubmissionEntity<{ user: 'deep', activity: 'shallow' }>>;
    submissions(params: SubmissionsParams<['activity']>): SimpleEndpointHandle<ActivitySubmissionEntity<{ user: 'shallow', activity: 'deep' }>>;
    submissions(params: SubmissionsParams<['user', 'activity']>): SimpleEndpointHandle<ActivitySubmissionEntity<{ user: 'deep', activity: 'deep' }>>;
    submissions(params?: SubmissionsParams): SimpleEndpointHandle<ActivitySubmissionEntity<{ user: 'shallow', activity: 'shallow' }>>;
    submissions(params: SubmissionsParams = {}): SimpleEndpointHandle<ActivitySubmissionEntity> {
        const includesQuery = inclusions(params.include);
        const paramsQuery = `${paramsToQuery({ ...params, activityId: this.id, include: undefined })}`;
        return { _path: `${this.classroomBase}/submission?${includesQuery}&${paramsQuery}` };
    }
}

class LiveActivityApi extends AbstractEndpointHandle<{
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
}> {
    constructor(private classroomBase: string) { super() }

    get _path() { return `${this.classroomBase}/activity/live` }

    submissions(params: SubmissionsParams<['user']>): SimpleEndpointHandle<ActivitySubmissionEntity<{ user: 'deep', activity: 'shallow' }>>;
    submissions(params: SubmissionsParams<['activity']>): SimpleEndpointHandle<ActivitySubmissionEntity<{ user: 'shallow', activity: 'deep' }>>;
    submissions(params: SubmissionsParams<['user', 'activity']>): SimpleEndpointHandle<ActivitySubmissionEntity<{ user: 'deep', activity: 'deep' }>>;
    submissions(params?: SubmissionsParams): SimpleEndpointHandle<ActivitySubmissionEntity<{ user: 'shallow', activity: 'shallow' }>>;
    submissions(params: SubmissionsParams = {}): SimpleEndpointHandle<ActivitySubmissionEntity> {
        const includesQuery = inclusions(params.include);
        const paramsQuery = `${paramsToQuery({ ...params, include: undefined })}`;
        return { _path: `${this.classroomBase}/submission?${includesQuery}&${paramsQuery}` };
    }
}

class ClassroomApi<Refs extends ClassroomEntityRefs> extends SimpleEndpointHandle<ClassroomEntity<Refs>> {
    constructor(private base: string, private include?: Inclusions<'members' | 'lessons'>) { super() }
    
    get _path() { return `${this.base}?${inclusions(this.include)}` };

    get joinCode(): EndpointHandle<{
        POST: { body: undefined, response: string },
        DELETE: { body: undefined, response: undefined },
    }> { return { _path: `${this.base}/join-code` } };

    me(include: Inclusions<'classroom' | 'classes', ['classroom']>): SimpleEndpointHandle<ClassroomMemberEntity<{ classroom: 'deep', classes: 'none' }>>;
    me(include: Inclusions<'classroom' | 'classes', ['classes']>): SimpleEndpointHandle<ClassroomMemberEntity<{ classroom: 'shallow', classes: 'deep' }>>;
    me(include: Inclusions<'classroom' | 'classes', ['classroom', 'classes']>): SimpleEndpointHandle<ClassroomMemberEntity<{ classroom: 'deep', classes: 'deep' }>>;
    me(include?: Inclusions<'classroom' | 'classes'>): SimpleEndpointHandle<ClassroomMemberEntity<{ classroom: 'shallow', classes: 'none' }>>;
    me(include?: Inclusions<'classroom' | 'classes'>): SimpleEndpointHandle<ClassroomMemberEntity> {
        return { _path: `${this.base}/me?${inclusions(include)}`, _imm: true };
    }

    get members() {
        return {
            all: { _path: `${this.base}/members` } as SimpleEndpointHandle<ClassroomMemberEntity<{ classroom: 'none', classes: 'none' }>[]>,
        };
    };

    member(id: string): SimpleEndpointHandle<ClassroomMemberEntity<{ classroom: 'shallow', classes: 'shallow' }>, {
        GET: undefined,
        PATCH: {
            role?: ClassroomRole,
        },
        DELETE: undefined,
    }> {
        return { _path: `${this.base}/members/${id}` };
    }

    lessons(include: Inclusions<'activities', ['activities']>): SimpleEndpointHandle<LessonEntity<{ activities: 'deep', classroom: 'none' }>>;
    lessons(include?: Inclusions<'activities'>): SimpleEndpointHandle<LessonEntity<{ activities: 'shallow', classroom: 'none' }>>;
    lessons(include?: Inclusions<'activities'>): SimpleEndpointHandle<LessonEntity> {
        return { _path: `${this.base}/lesson?${inclusions(include)}` };
    }

    lesson(id: string, include: Inclusions<'classroom' | 'activities', ['classroom']>): LessonApi<{ classroom: 'deep', activities: 'shallow' }>;
    lesson(id: string, include: Inclusions<'classroom' | 'activities', ['activities']>): LessonApi<{ classroom: 'shallow', activities: 'deep' }>;
    lesson(id: string, include: Inclusions<'classroom' | 'activities', ['classroom', 'activities']>): LessonApi<{ classroom: 'deep', activities: 'deep' }>;
    lesson(id: string, include?: Inclusions<'classroom' | 'activities'>): LessonApi<{ classroom: 'shallow', activities: 'shallow' }>;
    lesson(id: string, include?: Inclusions<'classroom' | 'activities'>) {
        return new LessonApi(`${this.base}/lesson/${id}`, include);
    }

    get live() {
        return new LiveActivityApi(this.base);
    }

    get ice(): SimpleEndpointHandle<RTCIceServer[]> {
        return { _path: `${this.base}/activity/ice` };
    }

    activity(id: string, include: Inclusions<'lesson', ['lesson']>): ActivityApi<{ lesson: 'deep' }>;
    activity(id: string, include?: Inclusions<'lesson'>): ActivityApi<{ lesson: 'shallow' | 'none' }>;
    activity(id: string, include?: Inclusions<'lesson'>) {
        return new ActivityApi(this.base, id, include);
    }
}

class UsersApi extends SimpleEndpointHandle<UserEntity, {
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
    constructor(private base: string) { super() }

    get _path() { return this.base };
}

const api = new class Api {
    me(include: Inclusions<'classes' | 'simulatedUsers', ['classes']>): SimpleEndpointHandle<UserEntity<{ classes: 'deep', simulatedUsers: 'none' }>>;
    me(include: Inclusions<'classes' | 'simulatedUsers', ['simulatedUsers']>): SimpleEndpointHandle<UserEntity<{ classes: 'shallow', simulatedUsers: 'deep' }>>;
    me(include: Inclusions<'classes' | 'simulatedUsers', ['classes', 'simulatedUsers']>): SimpleEndpointHandle<UserEntity<{ classes: 'deep', simulatedUsers: 'deep' }>>;
    me(include?: Inclusions<'classes' | 'simulatedUsers'>): SimpleEndpointHandle<UserEntity<{ classes: 'shallow', simulatedUsers: 'none' }>>;
    me(include?: Inclusions<'classes' | 'simulatedUsers'>): SimpleEndpointHandle<UserEntity> {
        return { _path: `/api/me?${inclusions(include)}`, _imm: true };
    }

    classroom(id: string, include: Inclusions<'members' | 'lessons', ['members']>): ClassroomApi<{ members: 'deep', lessons: 'none' }>;
    classroom(id: string, include: Inclusions<'members' | 'lessons', ['lessons']>): ClassroomApi<{ members: 'none', lessons: 'deep' }>;
    classroom(id: string, include: Inclusions<'members' | 'lessons', ['members', 'lessons']>): ClassroomApi<{ members: 'deep', lessons: 'deep' }>;
    classroom(id: string, include?: Inclusions<'members' | 'lessons'>): ClassroomApi<{ members: 'none', lessons: 'none' }>;
    classroom(id: string, include?: Inclusions<'members' | 'lessons'>) {
        return new ClassroomApi(`/api/classroom/${id}`, include);
    }

    classrooms = {
        create: { _path: '/api/classroom' } as SimpleEndpointHandle<ClassroomEntity<{ members: 'shallow', lessons: 'none' }>, {
            POST: { displayName: string },
        }>,
        join: { _path: '/api/classroom/join' } as SimpleEndpointHandle<ClassroomEntity<{ members: 'none', lessons: 'none' }>, { POST: { code: string } }>,
    };

    user(id: string) {
        return new UsersApi(`/api/users/${id}`);
    }

    users = {
        all(params: PaginationParams & { includeSimulated?: boolean } = {}): SimpleEndpointHandle<UserEntity<{ classes: 'none', simulatedUsers: 'none' }>> {
            return { _path: `/api/users?${paramsToQuery(params)}` };
        },
        createSimulated: { _path: `/api/users/simulated` } as SimpleEndpointHandle<UserEntity<{ classes: 'none', simulatedUsers: 'none' }>, {
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