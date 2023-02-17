import loadModule from '@brillout/load-module';
import { MiKe } from '@necode-org/mike';
import { getNodeSourceRange } from '@necode-org/mike/ast';
import { CreateParamsFunctions, JsLibraryImplementation, MiKeProgram, MiKeProgramWithoutExternals, ParamRecord, StateRecord } from '@necode-org/mike/codegen/js';
import { createJavascriptTarget } from '@necode-org/mike/codegen/js/JavascriptTarget';
import { createMiKeDiagnosticsManager } from '@necode-org/mike/diagnostics';
import { parsePolicyValidatorConfig, validate } from '@necode-org/policy-dev';
import { readFile } from 'fs/promises';
import * as path from 'path';
import { Values } from '~api/PolicyValidatorConfig';
import { NetworkId, PolicyParams, PolicyParamValue } from '~api/RtcNetwork';
import { SignalData } from '~api/ws';
import { events, necodeLib } from '~mike-config';
import asArray from '~utils/asArray';
import { ArrayKeyMap } from '~utils/maps/ArrayKeyMap';
import { typeAssert } from '~utils/typeguards';
import allPolicies from './allPolicies';
import { ConnectionInfo, RtcCoordinator, RtcPolicy, RtcPolicySettings } from './RtcPolicy';

const EXTERNALS = 'externals';
const necodeLibImpl: JsLibraryImplementation<typeof necodeLib> = {
    types: {
        User: () => ({ serialize: 'x=>x', deserialize: 'x=>x', }),
        Policy: () => ({ serialize: 'x=>x', deserialize: 'x=>x', }),
        Group: () => ({ serialize: `x=>x.serialize()`, deserialize: `${EXTERNALS}.deserializeGroup` }),
        SignalData: () => ({ serialize: 'x=>{throw new Error("SignalData is not serializable")}', deserialize: 'x=>x' }),
        // Internal types (unspeakable)
        $Bug: () => ({ serialize: '', deserialize: '' }),
        $Branch: () => ({ serialize: '', deserialize: '' }),
    },
    values: {
        link: () => ({ emit: `${EXTERNALS}.link` }),
        unlink: () => ({ emit: `${EXTERNALS}.unlink` }),
        Group: () => ({ emit: `${EXTERNALS}.makeGroup` }),
        BUG: () => ({ emit: `${EXTERNALS}.BUG` }),
        _$BRANCH: () => ({ emit: '' }), // Should never appear
    },
};

interface PolicyReference {
    name: string;
    params: PolicyParams;
}

interface MiKeExposed {
    some(v: any): unknown;
    none: unknown;
}

export default async function createMiKePolicy(filename: string): Promise<RtcPolicy | undefined> {
    const mikeSource = await readFile(path.join(__dirname, filename), { encoding: 'utf-8' });
    const policyName = path.basename(filename, '.mike');

    const validationResult = await validate(mikeSource);

    if (!validationResult.ok) {
        console.error(`Failed to validate ${filename}.`);
        for (const { severity, message, details } of validationResult.messages) {
            console[severity](`\t[${severity}]`, message);
            for (const detail of details ?? []) {
                console[severity](`\t\t`, detail);
            }
        }
        return;
    }

    const mike = new MiKe();
    mike.setEvents(events);

    mike.addLibrary(necodeLib);
    mike.setTarget(createJavascriptTarget(['some', 'none']));
    mike.addLibraryImplementation(necodeLibImpl);

    const diagnostics = createMiKeDiagnosticsManager();
    mike.setDiagnosticsManager(diagnostics);

    mike.init();


    mike.loadScript(mikeSource);
    const jsCodeBuffer = mike.tryValidateAndEmit();
    if (!jsCodeBuffer) {
        diagnostics.getDiagnostics().forEach(d => console.error(d.toString()));
        throw new Error(`MiKe Compilation Failed.\n\t${diagnostics.getDiagnostics().join('\n\t')}`);
    }

    const validatorConfigString = mike.getComments()!
        .filter(x => x.content.startsWith('//%'))
        .sort((a, b) => getNodeSourceRange(a).start.line - getNodeSourceRange(b).start.line)
        .map(x => x.content.slice(3))
        .join('\n');

    const validatorConfig = parsePolicyValidatorConfig(validatorConfigString);

    const jsModuleCode = `data:text/javascript;base64,${Buffer.from(jsCodeBuffer).toString('base64')}`;
    const createMiKeProgram: MiKeProgramWithoutExternals<MiKeExposed> = (await loadModule(jsModuleCode)).default;

    // TODO: Watch https://github.com/microsoft/TypeScript/issues/33892
    // @rtcPolicy
    class Policy implements RtcCoordinator {
        static readonly policyId = policyName;

        private currentUsers = new Set<string>();        
        private connectionMap = new ArrayKeyMap<[string, string], ConnectionInfo>();
        private policyMap = new Map<string, PolicyReference>();

        private program: MiKeProgram<MiKeExposed>;
        private params: ParamRecord;
        private mikeState: StateRecord;

        private joinListener?: MiKeProgram['listeners'][any];
        private leaveListener?: MiKeProgram['listeners'][any];
        private signalListener?: MiKeProgram['listeners'][any];

        constructor(network: NetworkId, users: Iterable<string>, private settings: RtcPolicySettings) {
            const bugSym = Symbol('BUG');
            this.program = createMiKeProgram({
                BUG: bugSym,
                debug: (...args) => {
                    console.log('[Debug]', ...args);
                    if (args[0] === bugSym) {
                        console.log('Params:', JSON.stringify(this.params));
                        console.log('State:', JSON.stringify(this.mikeState));
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

                makeGroup: (policySourceName: string) => {
                    const { name, params } = this.policyMap.get(policySourceName)!;
                    const policy = allPolicies.find(x => x.policyId === name)!;
                    const group = new policy(network, [], {
                        params,
                        rtc: settings.rtc,
                    });
                    return {
                        group,
                        join(user: string) {
                            this.group.onUserJoin(user);
                        },
                        leave(user: string) {
                            this.group.onUserLeave(user);
                        },
                        has(user: string) {
                            this.group.hasUser(user);
                        },
                        serialize() {
                            return {
                                policySourceName,
                                state: this.group.getState(),
                            };
                        }
                    };
                },

                deserializeGroup: (data: { policySourceName: string, state: string }) => {
                    const { name, params } = this.policyMap.get(data.policySourceName)!;
                    const policy = allPolicies.find(x => x.policyId === name)!;
                    const group = new policy(network, [], {
                        params,
                        rtc: settings.rtc,
                    });
                    group.loadState(data.state);
                    return group;
                },
            });

            this.params = this.createParams();
            this.mikeState = this.program.createInitialState();

            this.joinListener = this.program.listeners.find(x => x.event === 'join');
            this.leaveListener = this.program.listeners.find(x => x.event === 'leave');
            this.signalListener = this.program.listeners.find(x => x.event === 'signal');

            for (const user of users) {
                this.onUserJoin(user);
            }
        }

        static validate(params: PolicyParams) {
            for (const config of asArray(validatorConfig)) {
                if (config.params) {
                    const possibleParamValues = asArray<Values>(config.params);
                    for (const paramValues of possibleParamValues) {
                        let result = true;
                        nextParam:
                        for (const name in paramValues) {
                            const actualValue = params[name];
                            nextOption:
                            for (const admit of asArray(paramValues[name])) {
                                switch (admit.type) {
                                    case 'boolean':
                                        if (actualValue.type !== 'boolean'
                                            || (admit.value !== undefined && !asArray(admit.value).includes(actualValue.value))) {
                                            continue nextOption;
                                        }
                                        break;
                                    case 'int':
                                        if (actualValue.type !== 'int') {
                                            continue nextOption;
                                        }
                                        if ('value' in admit) {
                                            if (!asArray(admit.value).includes(actualValue.value)) {
                                                continue nextOption;
                                            }
                                        }
                                        else if (!(actualValue.value >= admit.ge) || !(actualValue.value <= admit.le)) {
                                            continue nextOption;
                                        }
                                        break;
                                    case 'float':
                                        if (actualValue.type !== 'float') {
                                            continue nextOption;
                                        }
                                        if ('value' in admit) {
                                            if (!asArray(admit.value).includes(actualValue.value)) {
                                                continue nextOption;
                                            }
                                        }
                                        else if (!(actualValue.value >= admit.ge) || !(actualValue.value <= admit.le)) {
                                            continue nextOption;
                                        }
                                        break;
                                    case 'string':
                                        if (actualValue.type !== 'string' || !asArray(admit.value).includes(actualValue.value)) {
                                            continue nextOption;
                                        }
                                        break;
                                }
                                continue nextParam;
                            }
                            result = false;
                        }
                        if (result) {
                            return true;
                        }
                    }
                }
            }

            for (const name in params) {
                let value = params[name];
                while (value.type === 'option') {
                    if (value.value === undefined) {
                        break;
                    }
                    value = value.value;
                }
                if (value.type === 'Policy') {
                    const policyName = value.name;
                    const policy = allPolicies.find(x => x.policyId === policyName);
                    if (!policy || !policy.validate(value.params)) {
                        return false;
                    }
                }
            }

            return false;
        }

        private validateSignal(event: string, data: SignalData) {
            for (const config of asArray(validatorConfig)) {
                if (config.signal) {
                    for (const signal of asArray(config.signal)) {
                        if (asArray(signal.type).includes(event)) {
                            const possibleSignalValues = asArray<Values>(signal.data);
                            for (const signalValues of possibleSignalValues) {
                                let result = true;
                                nextParam:
                                for (const name in signalValues) {
                                    const actualValue = data[name];
                                    nextOption:
                                    for (const admit of asArray(signalValues[name])) {
                                        switch (admit.type) {
                                            case 'boolean':
                                                if (typeof actualValue !== 'boolean'
                                                    || (admit.value !== undefined && !asArray(admit.value).includes(actualValue))) {
                                                    continue nextOption;
                                                }
                                                break;
                                            case 'int':
                                                if (typeof actualValue !== 'number' || actualValue % 1 !== 0) {
                                                    continue nextOption;
                                                }
                                                if ('value' in admit) {
                                                    if (!asArray(admit.value).includes(actualValue)) {
                                                        continue nextOption;
                                                    }
                                                }
                                                else if (!(actualValue >= admit.ge) || !(actualValue <= admit.le)) {
                                                    continue nextOption;
                                                }
                                                break;
                                            case 'float':
                                                if (typeof actualValue !== 'number') {
                                                    continue nextOption;
                                                }
                                                if ('value' in admit) {
                                                    if (!asArray(admit.value).includes(actualValue)) {
                                                        continue nextOption;
                                                    }
                                                }
                                                else if (!(actualValue >= admit.ge) || !(actualValue <= admit.le)) {
                                                    continue nextOption;
                                                }
                                                break;
                                            case 'string':
                                                if (typeof actualValue !== 'string' || !asArray(admit.value).includes(actualValue)) {
                                                    continue nextOption;
                                                }
                                                break;
                                        }
                                        continue nextParam;
                                    }
                                    result = false;
                                }
                                if (result) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }

            return false;
        }

        private createParams() {
            const createGetOptionParam = (name: string, obj: PolicyParamValue | undefined): CreateParamsFunctions<[]> | undefined => {
                if (obj === undefined) {
                    return;
                }
                return {
                    getBooleanParam: () => {
                        typeAssert(obj.type === 'boolean');
                        return obj.value;
                    },
                    getIntParam: () => {
                        typeAssert(obj.type === 'int');
                        return BigInt(obj.value);
                    },
                    getFloatParam: () => {
                        typeAssert(obj.type === 'float');
                        return obj.value;
                    },
                    getStringParam: () => {
                        typeAssert(obj.type === 'string');
                        return obj.value;
                    },
                    getOptionParam: () => {
                        typeAssert(obj.type === 'option');
                        return createGetOptionParam(name, obj.value);
                    },
                    getCustomParam: typeName => {
                        if (typeName === 'Policy') {
                            typeAssert(obj.type === 'Policy');
                            this.policyMap.set(name, obj);
                            return name;
                        }
                    },
                };
            };
            return this.program.createParams({
                getBooleanParam: name => {
                    const param = this.settings.params[name];
                    typeAssert(param.type === 'boolean');
                    return param.value;
                },
                getIntParam: name => {
                    const param = this.settings.params[name];
                    typeAssert(param.type === 'int');
                    return BigInt(param.value);
                },
                getFloatParam: name => {
                    const param = this.settings.params[name];
                    typeAssert(param.type === 'float');
                    return param.value;
                },
                getStringParam: name => {
                    const param = this.settings.params[name];
                    typeAssert(param.type === 'string');
                    return param.value;
                },
                getOptionParam: name => {
                    const param = this.settings.params[name];
                    typeAssert(param.type === 'option');
                    return createGetOptionParam(name, param.value);
                },
                getCustomParam: (name, typeName) => {
                    if (typeName === 'Policy') {
                        const param = this.settings.params[name];
                        typeAssert(param.type === 'Policy');
                        this.policyMap.set(name, param);
                        return name;
                    }
                },
            });
        }
        
        onUserJoin(user: string): void {
            if (this.currentUsers.has(user)) {
                return;
            }
            this.currentUsers.add(user);
            if (this.joinListener) {
                this.mikeState = this.joinListener.callback({
                    state: this.mikeState,
                    args: [user],
                    params: this.params,
                }).state;
            }
        }

        onUserLeave(user: string): void {
            if (!this.currentUsers.has(user)) {
                return;
            }
            this.currentUsers.delete(user);
            if (this.leaveListener) {
                this.mikeState = this.leaveListener.callback({
                    state: this.mikeState,
                    args: [user],
                    params: this.params,
                }).state;
            }
        }

        private createSignalPayload(info: SignalData) {
            return {
                getInt: (name: string) => name in info && typeof info[name] === 'number' && (info[name] as number % 1) === 0
                    ? this.program.exposed.some(BigInt(info[name]))
                    : this.program.exposed.none,
                getFloat: (name: string) => name in info && typeof info[name] === 'number'
                    ? this.program.exposed.some(info[name])
                    : this.program.exposed.none,
                getBoolean: (name: string) => name in info && typeof info[name] === 'boolean'
                    ? this.program.exposed.some(info[name])
                    : this.program.exposed.none,
                getString: (name: string) => name in info && typeof info[name] === 'string'
                    ? this.program.exposed.some(info[name])
                    : this.program.exposed.none,
            };
        }

        signal(user: string, event: string, info: SignalData): void {
            console.log('signal', user, event, info);
            if (!this.currentUsers.has(user)) {
                return;
            }
            if (!this.validateSignal(event, info)) {
                throw new Error('Invalid signal payload for policy type');
            }
            if (this.signalListener) {
                this.mikeState = this.signalListener.callback({
                    state: this.mikeState,
                    args: [user, event, this.createSignalPayload(info)],
                    params: this.params,
                }).state;
            }
        }

        hasUser(user: string) {
            return this.currentUsers.has(user);
        }

        getState(): string {
            return this.program.serialize(this.mikeState);
        }

        loadState(state: string): void {
            this.mikeState = this.program.deserialize(state);
        }
    }

    return Policy;
}