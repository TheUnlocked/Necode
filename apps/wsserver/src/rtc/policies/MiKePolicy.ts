import * as path from 'path';
import { readFile } from 'fs/promises';
import { ConnectionInfo, RtcCoordinator, RtcPolicy, RtcPolicySettings } from './RtcPolicy';
import { MiKe } from '@necode-org/mike';
import { createMiKeDiagnosticsManager } from '@necode-org/mike/diagnostics';
import { JavascriptTarget, JsLibraryImplementation, MiKeProgram, MiKeProgramWithoutExternals } from '@necode-org/mike/codegen/js';
import { ArrayKeyMap } from '~utils/maps/ArrayKeyMap';
import loadModule from '@brillout/load-module';
import { NetworkId } from '~api/RtcNetwork';
import { events, necodeLib } from '~mike-config';

const EXTERNALS = 'externals';
const necodeLibImpl: JsLibraryImplementation<typeof necodeLib> = {
    types: {
        User: () => ({ serialize: 'x=>x', deserialize: 'x=>x', }),
        Policy: () => ({ serialize: 'x=>x', deserialize: 'x=>x', }), // TODO
        Group: () => ({ serialize: 'x=>x._id', deserialize: `id=>${EXTERNALS}.fetchGroupById(id)` }), // TODO
        SignalData: () => ({ serialize: 'x=>{throw new Error("SignalData is not serializable")}', deserialize: 'x=>x' }),
        // Internal types (unspeakable)
        $Bug: () => ({ serialize: '', deserialize: '' }),
        $Branch: () => ({ serialize: '', deserialize: '' }),
    },
    values: {
        link: () => ({ emit: `${EXTERNALS}.link` }),
        unlink: () => ({ emit: `${EXTERNALS}.unlink` }),
        Group: () => ({ emit: `${EXTERNALS}.makeGroup` }), // TODO
        BUG: () => ({ emit: `${EXTERNALS}.BUG` }),
        _$BRANCH: () => ({ emit: '' }), // Should never appear
    },
};

const mike = new MiKe();
mike.setEvents(events);

mike.addLibrary(necodeLib);
mike.setTarget(JavascriptTarget);
mike.addLibraryImplementation(necodeLibImpl);

mike.init();

export default async function createMiKePolicy(filename: string): Promise<RtcPolicy> {
    const mikeSource = await readFile(path.join(__dirname, filename), { encoding: 'utf-8' });
    const policyName = path.basename(filename, '.mike');

    const diagnostics = createMiKeDiagnosticsManager();
    mike.setDiagnosticsManager(diagnostics);

    mike.loadScript(mikeSource);
    const jsCodeBuffer = mike.tryValidateAndEmit();
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
            const bugSym = Symbol('BUG');
            this.program = createMiKeProgram({
                BUG: bugSym,
                debug: (...args) => {
                    console.log('[Debug]', ...args);
                    if (args[0] === bugSym) {
                        console.log(JSON.stringify(this.mikeState));
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

            this.mikeState = this.program.createInitialState();

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