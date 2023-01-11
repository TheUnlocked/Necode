import * as path from 'path';
import { readFile } from 'fs/promises';
import { ConnectionInfo, RtcCoordinator, rtcPolicy, RtcPolicySettings } from './RtcPolicy';
import { MiKe } from '@necode-org/mike';
import { functionOf, SimpleType, TypeKind,unitType } from '@necode-org/mike/types';
import { createMiKeDiagnosticsManager } from '@necode-org/mike/diagnostics/DiagnosticCodes';
import { LibraryInterface } from '@necode-org/mike/library/Library';
import { TypeAttributeKind } from '@necode-org/mike/types/Attribute';
import { JavascriptTarget, JsLibraryImplementation, MiKeProgram, MiKeProgramWithoutExternals } from '@necode-org/mike/codegen/js';
import { ArrayKeyMap } from '../../../../src/util/maps/ArrayKeyMap';
import loadModule from '@brillout/load-module';
import { NetworkId } from '../../../../src/api/RtcNetwork';

const userType: SimpleType = { kind: TypeKind.Simple, name: 'User', typeArguments: [] };
const policyType: SimpleType = { kind: TypeKind.Simple, name: 'Policy', typeArguments: [] };
const groupType: SimpleType = { kind: TypeKind.Simple, name: 'Group', typeArguments: [] };

const necodeLib: LibraryInterface = {
    types: [
        { name: 'User', numParameters: 0, quantify: () => ({ attributes: [], members: {} }) },
        { name: 'Policy', numParameters: 0, quantify: () => ({ attributes: [{ kind: TypeAttributeKind.IsLegalParameter }], members: {} }) },
        { name: 'Group', numParameters: 0, quantify: () => ({ attributes: [], members: {
            join: functionOf([userType], unitType),
            leave: functionOf([userType], unitType),
            forget: functionOf([userType], unitType),
        } }) },
    ],
    values: [
        { name: 'link', type: functionOf([userType, userType], unitType) },
        { name: 'unlink', type: functionOf([userType, userType], unitType) },
        { name: 'Group', type: functionOf([policyType], groupType) },
    ]
} as const;

const EXTERNALS = 'externals';
const necodeLibImpl: JsLibraryImplementation<typeof necodeLib> = {
    types: {
        User: () => ({ serialize: 'x=>x', deserialize: 'x=>x', }),
        Policy: () => ({ serialize: 'x=>x', deserialize: 'x=>x', }), // TODO
        Group: () => ({ serialize: 'x=>x._id', deserialize: `id=>${EXTERNALS}.fetchGroupById(id)` }), // TODO
    },
    values: {
        link: () => ({ emit: `${EXTERNALS}.link` }),
        unlink: () => ({ emit: `${EXTERNALS}.unlink` }),
        Group: () => ({ emit: `${EXTERNALS}.makeGroup` }), // TODO
    },
};

const mike = new MiKe();
mike.setEvents([
    { name: 'join', required: false, argumentTypes: [userType] },
    { name: 'leave', required: false, argumentTypes: [userType] },
]);

mike.addLibrary(necodeLib);
mike.setTarget(JavascriptTarget);
mike.addLibraryImplementation(necodeLibImpl);

mike.init();

export default async function createMiKePolicy(filename: string) {
    const mikeSource = await readFile(path.join(__dirname, filename), { encoding: 'utf-8' });
    const policyName = path.basename(filename, '.mike');

    const diagnostics = createMiKeDiagnosticsManager();
    mike.setDiagnosticsManager(diagnostics);

    mike.loadScript(filename, mikeSource);
    const jsCodeBuffer = mike.tryValidateAndEmit(filename);
    if (!jsCodeBuffer) {
        diagnostics.getDiagnostics().forEach(d => console.error(d.toString()));
        throw new Error(`MiKe Compilation Failed.\n\t${diagnostics.getDiagnostics().join('\n\t')}`);
    }

    const jsModuleCode = `data:text/javascript;base64,${Buffer.from(jsCodeBuffer).toString('base64')}`;
    const createMiKeProgram: MiKeProgramWithoutExternals = (await loadModule(jsModuleCode)).default;

    // TODO: Watch https://github.com/microsoft/TypeScript/issues/33892
    // @rtcPolicy
    class Policy implements RtcCoordinator {
        static readonly policyId = policyName;

        private currentUsers = new Set<string>();        
        private connectionMap = new ArrayKeyMap<[string, string], ConnectionInfo>();

        private program: MiKeProgram;
        private mikeState: any;

        private joinListener?: MiKeProgram['listeners'][any];
        private leaveListener?: MiKeProgram['listeners'][any];

        constructor(network: NetworkId, users: Iterable<string>, private settings: RtcPolicySettings) {
            this.program = createMiKeProgram({
                debug: (...args) => {
                    console.log(...args);
                    if (typeof args[0] === 'string' && args[0].includes('BUG')) {
                        console.log(JSON.stringify(Object.fromEntries(this.program.state.map(x => [x.name, x.default]))));
                    }
                },
                link: (a: string, b: string) => {
                    console.debug(a, '->', b);
                    this.connectionMap.set([a, b], this.settings.rtc.createWebRtcConnection(network, a, b));
                },
                unlink: (a: string, b: string) => {
                    console.debug(a, '-X', b);
                    const connection = this.connectionMap.get([a, b]);
                    if (connection) {
                        connection.destroyWebRtcConnection();
                        this.connectionMap.delete([a, b]);
                    }
                    else {
                        console.warn('Tried to sever connection between', a, 'and', b, 'but the connection did not exist.');
                    }
                },
            });

            this.mikeState = Object.fromEntries(this.program.state.map(x => [x.name, x.default]));

            this.joinListener = this.program.listeners.find(x => x.event === 'join');
            this.leaveListener = this.program.listeners.find(x => x.event === 'leave');

            for (const user of users) {
                this.onUserJoin(user);
            }
        }
        
        onUserJoin(user: string): void {
            if (this.currentUsers.has(user)) {
                return;
            }
            this.currentUsers.add(user);
            this.mikeState = this.joinListener?.callback({
                state: this.mikeState,
                args: [user],
                params: {},
            }).state;
            console.log(this.mikeState);
        }
        onUserLeave(user: string): void {
            if (!this.currentUsers.has(user)) {
                return;
            }
            this.currentUsers.delete(user);
            this.mikeState = this.leaveListener?.callback({
                state: this.mikeState,
                args: [user],
                params: {},
            }).state;
            console.log(this.mikeState);
        }
    }

    return Policy;
}