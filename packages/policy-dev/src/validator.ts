import loadModule from '@brillout/load-module';
import { MiKe } from '@necode-org/mike';
import { JsLibraryImplementation, MiKeProgram as _MiKeProgram, MiKeProgramWithoutExternals as _MiKeProgramWithoutExternals, ParameterType } from '@necode-org/mike/codegen/js';
import { createMiKeDiagnosticsManager, Severity } from '@necode-org/mike/diagnostics';
import { necodeLib, events as necodeEvents, internalUniqueBugType } from '~mike-config';
import { Arbitrary, boolean, check, constant, float, integer as _integer, oneof, property, record, shuffledSubarray, stringify, tuple } from 'fast-check';
import { SingleBar } from 'cli-progress';
import { createJavascriptTarget } from '@necode-org/mike/codegen/js/JavascriptTarget';
import { Mutable, NewType } from '~ui/src/util/types';
import { Values, SignalInfo, ValidatorConfig, Value, parseValidatorConfig, ParseValidationConfigError } from './ValidatorConfig';
import { ASTNodeKind, Block, DebugStatement, FloatLiteral, getNodeSourceRange, Identifier, StatementOrBlock, stringifyPosition, Variable, visit } from '@necode-org/mike/ast';
import { TypeKind } from '@necode-org/mike/types';

interface MiKeExposed {
    some(v: any): unknown;
    none: unknown;
}

type MiKeProgram = _MiKeProgram<MiKeExposed>;
type MiKeProgramWithoutExternals = _MiKeProgramWithoutExternals<MiKeExposed>;

const integer: typeof _integer = (config = { min: -10, max: 100 }) => _integer(config);

const EXTERNALS = 'externals';
const necodeLibImpl: JsLibraryImplementation<typeof necodeLib> = {
    types: {
        User: () => ({ serialize: `x=>${EXTERNALS}.serializeUser(x)`, deserialize: `x=>${EXTERNALS}.deserializeUser(x)`,  }),
        Policy: () => ({ serialize: 'x=>x', deserialize: 'x=>x', }),
        Group: () => ({ serialize: `x=>${EXTERNALS}.serializeGroup(x)`, deserialize: `x=>${EXTERNALS}.deserializeGroup(x)` }),
        SignalData: () => ({ serialize: 'x=>{throw new Error("SignalData is not serializable")}', deserialize: 'x=>x' }),
        // Internal types (unspeakable)
        $Branch: () => ({ serialize: '', deserialize: '' }),
        $Bug: () => ({ serialize: '', deserialize: '' }),
    },
    values: {
        link: () => ({ emit: `${EXTERNALS}.link` }),
        unlink: () => ({ emit: `${EXTERNALS}.unlink` }),
        Group: () => ({ emit: `${EXTERNALS}.makeGroup` }),
        BUG: () => ({ emit: `${EXTERNALS}.BUG` }),
        _$BRANCH: () => ({ emit: `${EXTERNALS}.$BRANCH` }),
    },
};

interface CompileMiKeResult {
    mike: MiKe;
    createProgram: MiKeProgramWithoutExternals;
    branches: Map<number, Block>;
}

async function compileMiKe(script: string): Promise<CompileMiKeResult> {
    const diagnostics = createMiKeDiagnosticsManager();
    const mike = new MiKe();
    mike.setDiagnosticsManager(diagnostics);
    mike.addLibrary(necodeLib);
    mike.setEvents(necodeEvents);
    mike.setTarget(createJavascriptTarget(['some', 'none']));
    mike.addLibraryImplementation(necodeLibImpl);

    mike.init();
    mike.loadScript(script);

    const branches = new Map<number, Block>();
    visit(mike.root, ast => {
        if (ast.kind === ASTNodeKind.Block) {
            if (!ast.statements.some(x => {
                if (x.kind === ASTNodeKind.DebugStatement) {
                    const firstArg = x.arguments[0];
                    if (firstArg) {
                        const type = mike.typechecker.fetchType(x.arguments[0]);
                        return type.kind === TypeKind.Simple && type.name === internalUniqueBugType.name;
                    }
                }
                return false;
            })) {
                const branchNum = branches.size;
                branches.set(branchNum, ast);
                
                // Currently there's no good way for third-parties to manipulate the MiKe AST
                // so we have to do everything by hand.
                const branchId: Mutable<Identifier> = { kind: ASTNodeKind.Identifier, name: '_$BRANCH' };
                const branchVar: Mutable<Variable> = { kind: ASTNodeKind.Variable, identifier: branchId };
                const branchNumFloatLit: Mutable<FloatLiteral> = { kind: ASTNodeKind.FloatLiteral, value: branchNum };

                const statement: Mutable<DebugStatement> = {
                    kind: ASTNodeKind.DebugStatement,
                    arguments: [branchVar, branchNumFloatLit],
                };

                branchId.parent = branchVar;
                branchVar.parent = statement;
                branchNumFloatLit.parent = statement;
                statement.parent = ast;

                (ast.statements as StatementOrBlock[]).unshift(statement);
            }
        }
    });

    mike.failSeverity = Severity.Error;

    const buffer = mike.tryValidateAndEmit();
    if (!buffer) {
        throw new Error(`Failed to compile script.\n${diagnostics.getDiagnostics().join('\n')}`);
    }
    // console.log(Buffer.from(buffer).toString('utf-8'));

    return {
        createProgram: (await loadModule(`data:text/javascript;base64,${Buffer.from(buffer).toString('base64')}`)).default,
        mike,
        branches,
    };
}

type User = NewType<number, 'User'>;
type Policy = NewType<number, 'Policy'>;

class Externals {
    links = new Map<User, Set<User>>();
    groups: Group[] = [];

    serializedUsers = new Set<User>();

    visitedBranches = new Set<number>();

    readonly BUG = Symbol('BUG');
    readonly $BRANCH = Symbol('$BRANCH');

    resetSerializationTracking() {
        this.serializedUsers = new Set();
    }

    readonly serializeUser = (user: User) => {
        this.serializedUsers.add(user);
        return user;
    };
    readonly deserializeUser = (id: number) => id;

    readonly serializeGroup = (group: Group) => group.id;
    readonly deserializeGroup = (id: number) => this.groups[id];

    readonly link = (u1: User, u2: User) => {
        const set = this.links.get(u1) ?? new Set();
        if (set.has(u2)) {
            throw new Error(`User ${u1} was already linked to User ${u2}`);
        }
        set.add(u2);
        this.links.set(u1, set);
    };

    readonly unlink = (u1: User, u2: User) => {
        const set = this.links.get(u1);
        if (!set) {
            throw new Error(`User ${u1} was unlinked before being linked to anyone`);
        }
        if (!set.has(u2)) {
            throw new Error(`User ${u1} wasn't linked to ${u2} before being unlinked`);
        }
        set.delete(u2);
        this.links.set(u1, set);
    };

    readonly makeGroup = (policy: Policy) => {
        const group = new Group(this.groups.length, policy);
        this.groups.push(group);
        return group;
    };

    readonly debug = (...args: any[]) => {
        if (args[0] === this.BUG) {
            throw new Error(`Encountered developer-specified bug: ${
                args.slice(1).map(x => typeof x === 'object' ? JSON.stringify(x) : x).join(' ')
            }`);
        }
        else if (args[0] === this.$BRANCH) {
            this.visitedBranches.add(args[1]);
        }
    };

    reset() {
        this.resetSerializationTracking();
        this.links = new Map();
        this.groups = [];
        this.visitedBranches = new Set();
    }
}

class Group {
    users = new Set<User>();

    constructor(public id: number, public policy: Policy) {}

    join = (user: User) => {
        if (this.users.has(user)) {
            throw new Error(`Tried to add ${user} to group ${this.id} but they were already in it`);
        }
        this.users.add(user);
    };
    leave = (user: User) => {
        if (!this.users.has(user)) {
            throw new Error(`Tried to remove ${user} from group ${this.id} but they weren't in it`);
        }
        this.users.delete(user);
    };
    has = (user: User) => this.users.has(user);
}

type PreparedEvent
    = { event: 'join', args: [User] }
    | { event: 'leave', args: [User] }
    | { event: 'signal', args: [User, string, { [name: string]: unknown }] }
    ;

function asArray<T>(x: T | T[]) {
    if (x instanceof Array) {
        return x;
    }
    return [x];
}

function assert(condition: boolean): asserts condition {
    if (!condition) {
        throw new Error(`Assertion Failed!`);
    }
}

const policy = () => integer({ min: 0, max: 3 }) as Arbitrary<Policy>;

const signalEvent = (user: User, config: SignalInfo) => record<PreparedEvent>({
    event: constant('signal'),
    args: tuple(
        constant(user),
        oneof(...asArray(config.type).map(constant)),
        oneof(...asArray<Values>(config.data).map(values =>
            record(Object.fromEntries(Object.keys(values).map(k => [
                k,
                oneof(...asArray(values[k]).map(config => {
                    switch (config.type) {
                        case 'boolean':
                            return config.value ? constant(config.value) : boolean();
                        case 'int':
                            if ('value' in config) {
                                return oneof(...asArray(config.value).map(v => constant(BigInt(v))));
                            }
                            return integer({ min: config.ge, max: config.le }).map(BigInt);
                        case 'float':
                            if ('value' in config) {
                                return oneof(...asArray(config.value).map(constant));
                            }
                            return float({ min: config.ge, max: config.le });
                        case 'string':
                            return oneof(...asArray(config.value).map(constant));
                    }
                })),
            ])))
        )),
    ),
});

// Note: It is possible for this arbitrary to produce impossible event sequences.
// These need to be filtered out later.
const unfilteredEvents = (config: SignalInfo[]) => {
    const NUM_USERS = 6;

    return constant([...new Array(NUM_USERS)].map((_, i) => i as User))
        .chain(users => tuple(...users.flatMap(user => {
            const joinLeave = [
                constant<PreparedEvent>({ event: 'join', args: [user] }),
                constant<PreparedEvent>({ event: 'leave', args: [user] }),
            ];

            if (config.length > 0) {
                return [
                    ...joinLeave,
                    // Four per user should be decent. Surprisingly, this is easier to read than not duplicating code.
                    oneof(...config.map(cfg => signalEvent(user, cfg))),
                    oneof(...config.map(cfg => signalEvent(user, cfg))),
                    oneof(...config.map(cfg => signalEvent(user, cfg))),
                    oneof(...config.map(cfg => signalEvent(user, cfg))),
                ];
            }
            return joinLeave.flatMap(x => [x, x]);
        })))
        .chain(evts => shuffledSubarray(evts, { minLength: evts.length }));
};

const filteredEvents = (config: SignalInfo[]) => unfilteredEvents(config).map(evts => {
    const referencedUsers = new Set<number>();
    const joined = new Set<User>();
    const filtered = [] as PreparedEvent[];
    for (const evt of evts) {
        const userIndex = evt.args[0] as User;
        switch (evt.event) {
            case 'join':
                if (joined.has(userIndex)) {
                    continue;
                }
                joined.add(userIndex);
                referencedUsers.add(userIndex as number);
                break;
            case 'leave':
                if (!joined.has(userIndex)) {
                    continue;
                }
                joined.delete(userIndex);
                break;
            case 'signal':
                if (!joined.has(userIndex)) {
                    continue;
                }
        }
        filtered.push(evt);
    }
    return filtered;
});

// Normalize user IDs so that the same event sequence with different (opaque) user IDs doesn't get tested multiple times.
const normalizedEvents = (config: SignalInfo[]) =>
    filteredEvents(config).map(events => {
        const userMap = new Map<number, number>();
        let userCounter = 0;
        for (const event of events) {
            let foundUser = userMap.get(event.args[0] as number);
            if (foundUser === undefined) {
                foundUser = userCounter++;
                userMap.set(event.args[0] as number, foundUser);
            }
            event.args[0] = foundUser as User;
        }
        return events;
    });

const events = normalizedEvents;


const param = (type: ParameterType, config: Value): Arbitrary<unknown> => {
    switch (type.variant) {
        case 'boolean':
            assert(config.type === 'boolean');
            return config.value ? constant(config.value) : boolean();
        case 'int':
            assert(config.type === 'int');
            if ('value' in config) {
                return oneof(...asArray(config.value).map(v => constant(BigInt(v))));
            }
            return integer({ min: config.ge, max: config.le }).map(BigInt);
        case 'float':
            assert(config.type === 'float');
            if ('value' in config) {
                return oneof(...asArray(config.value).map(constant));
            }
            return float({ min: config.ge, max: config.le });
        case 'string':
            assert(config.type === 'string');
            return oneof(...asArray(config.value).map(constant));
        case 'option':
            return oneof(
                constant({ p: false }),
                {
                    arbitrary: record({ p: constant(false), v: param(type.type, config) }),
                    weight: 4,
                },
            );
        case 'custom':
            switch (type.name) {
                case 'Policy':
                    return policy();
                default:
                    throw new Error(`Unsupported param type ${type.name}`);
            }
    }
};

const params = (program: MiKeProgram, values: Values) => record(Object.fromEntries(
        program.params.map(p => [
            p.name,
            oneof(...asArray(values[p.name]).map(v => param(p.type, v))),
        ])
    ))
    .map(values => program.createParams({
            getIntParam: name => values[name] as BigInt,
            getFloatParam: name => values[name] as number,
            getBooleanParam: name => values[name] as boolean,
            getStringParam: name => values[name] as string,
            getOptionParam: name => {
                let value = values[name] as { p: boolean, v: unknown };
                if (value.p) {
                    const fns = {
                        getIntParam: () => value.v as BigInt,
                        getFloatParam: () => value.v as number,
                        getBooleanParam: () => value.v as boolean,
                        getStringParam: () => value.v as string,
                        getOptionParam: () => {
                            value = value.v as typeof value;
                            return fns;
                        },
                        getCustomParam: () => value,
                    };
                    return fns;
                }
                return undefined;
            },
            getCustomParam: name => values[name],
        }),
    );

const testConfig = (program: MiKeProgram, validatorConfig: ValidatorConfig) =>
    oneof(...asArray(validatorConfig)
        .flatMap(config => asArray<Values | undefined>(config.params)
            .flatMap(paramsConfig => tuple(
                events(config.signal ? asArray(config.signal) : []),
                paramsConfig ? params(program, paramsConfig) : constant({}),
            ))
        )
    );

class ValidationError extends Error {
    name = 'ValidationError';
    constructor(message: string, public event: PreparedEvent) {
        super(message);
    }
}

interface ValidateConfigMatchesProgramResult {
    ok: boolean;
    warnings: string[];
    errors: string[];
}

function validateConfigMatchesProgram(configs: ValidatorConfig, program: MiKeProgram): ValidateConfigMatchesProgramResult {
    const warnings = [] as string[];
    const errors = [] as string[];

    let configIndex = configs instanceof Array ? 0 : -1;
    for (const config of asArray(configs)) {
        const configName = configIndex >= 0 ? `config[${configIndex++}]` : 'config';

        if (!config.params) {
            if (program.params.length !== 0) {
                errors.push(`${configName}.params is missing, but the program has params.`);
            }
        }
        else {
            let configParamsIndex = config.params instanceof Array ? 0 : -1;
            for (const configParams of asArray<Values>(config.params)) {
                const paramsName = configParamsIndex >= 0 ? `${configName}.params[${configParamsIndex++}]` : `${configName}.params`;

                const configParamNames = new Set(Object.keys(configParams));
                for (const { name, type } of program.params) {
                    let deepParamType = type;
                    while (deepParamType.variant === 'option') {
                        deepParamType = deepParamType.type;
                    }

                    if (deepParamType.variant === 'custom') {
                        // Custom params do not need and should not have configuration
                        if (configParamNames.delete(deepParamType.name)) {
                            errors.push(`${paramsName}.${name} should not exist, since that param has non-primitive type ${deepParamType.name}.`);
                        }
                        continue;
                    }

                    if (configParamNames.delete(name)) {
                        let configValueIndex = configParams[name] instanceof Array ? 0 : -1;
                        for (const configParamValue of asArray(configParams[name])) {
                            const valueName = configValueIndex >= 0 ? `${paramsName}.${name}[${configValueIndex++}]` : `${paramsName}.${name}`;

                            if (configParamValue.type !== deepParamType.variant) {
                                errors.push(`${valueName} should be of type ${deepParamType.variant}.`);
                            }
                        }
                    }
                    else {
                        if (type.variant === 'option') {
                            errors.push(`${paramsName}.${name} is missing. Optional params should still specify the deep primitive value.`);
                        }
                        else {
                            errors.push(`${paramsName}.${name} is missing.`);
                        }
                    }
                }

                for (const name of configParamNames) {
                    warnings.push(`${paramsName}.${name} is present, but that param does not appear in the program.`);
                }
            }
        }
    }

    return {
        ok: errors.length === 0,
        warnings,
        errors,
    };
}

const jsonReplacer = (_k: string, v: unknown) => typeof v === 'bigint' ? Number(v) : v;

export async function validate(source: string, options = {
    numRuns: 10_000,
}) {
    const progressBar = new SingleBar({
        format: 'Validation Progress |{bar}| {value}/{total} Passed ({percentage}%)',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
    });

    const { createProgram, mike, branches } = await compileMiKe(source);
    const externals = new Externals();
    const program = createProgram(externals);

    const validatorConfigString = mike.getComments()!
        .filter(x => x.content.startsWith('//%'))
        .sort((a, b) => getNodeSourceRange(a).start.line - getNodeSourceRange(b).start.line)
        .map(x => x.content.slice(3))
        .join('\n');

    if (validatorConfigString === '') {
        console.error('🛑 Parameter configuration not found.');
        console.error('Every policy must include a parameter configuration in //% comments.');
        return false;
    }

    let validatorConfig: ValidatorConfig;
    try {
        validatorConfig = parseValidatorConfig(validatorConfigString);
    }
    catch (e) {
        if (e instanceof SyntaxError) {
            console.error('🛑 Parameter configuration is not valid JSON.');
            return false;
        }
        if (e instanceof ParseValidationConfigError) {
            console.error('🛑 Parameter configuration failed to load. See stack trace below for more info.');
            console.error(e.stack);
            return false;
        }

        console.error('🛑 Parameter configuration failed to load due to unknown error.');
        throw e;
    }

    const configValidationResult = validateConfigMatchesProgram(validatorConfig, program);

    if (configValidationResult.warnings.length > 0) {
        for (const warning of configValidationResult.warnings) {
            console.warn(`⚠️ ${warning}`);
        }
    }

    if (configValidationResult.errors.length > 0) {
        console.error(`🛑 Parameter configuration didn't match the program:`);
        for (const error of configValidationResult.errors) {
            console.error(`\t${error}`);
        }
    }

    if (!configValidationResult.ok) {
        return false;
    }

    const allBranchesVisited = new Set<number>();

    const inputs = new Set<string>();
    progressBar.start(options.numRuns, 0);

    const result = check(
        property(testConfig(program, validatorConfig), data => {
            const dataString = stringify(data);
            if (inputs.has(dataString)) {
                return;
            }

            const [events, params] = data;

            const joined = new Set<User>();
            let state = program.createInitialState();
            const listeners = Object.fromEntries(program.listeners.map(l => [l.event, l.callback]));
            for (const event of events) {
                const { event: eventName, args } = event;
                let realArgs: unknown[] = [...args];
                if (eventName === 'signal') {
                    const dict = args[2];
                    realArgs[2] = {
                        getInt: (name: string) =>
                            typeof dict[name] === 'bigint' ? program.exposed.some(dict[name]) : program.exposed.none,
                        getFloat: (name: string) =>
                            typeof dict[name] === 'number' ? program.exposed.some(dict[name]) : program.exposed.none,
                        getString: (name: string) =>
                            typeof dict[name] === 'string' ? program.exposed.some(dict[name]) : program.exposed.none,
                        getBoolean: (name: string) =>
                            typeof dict[name] === 'boolean' ? program.exposed.some(dict[name]) : program.exposed.none,
                    };
                }
                try {
                    const result = listeners[eventName]?.({
                        params,
                        state,
                        args: realArgs,
                    });

                    if (result) {
                        state = result.state;
                    }
                }
                catch (e: any) {
                    throw new ValidationError(e.message, event);
                }
                if (eventName === 'join') {
                    joined.add(args[0]);
                }
                else if (eventName === 'leave') {
                    joined.delete(args[0]);
                    if ([...externals.links.entries()].some(([user, others]) => (others.size > 0 && user === args[0]) || others.has(args[0]))) {
                        throw new ValidationError(`User ${args[0]} was still linked even after leaving`, event);
                    }
                    if (externals.groups.some(g => g.has(args[0]))) {
                        throw new ValidationError(`User ${args[0]} was still in a sub-group even after leaving`, event);
                    }
                    externals.resetSerializationTracking();
                    program.serialize(state);
                    if (externals.serializedUsers.has(args[0])) {
                        throw new ValidationError(`User ${args[0]} was still tracked in policy state after leaving, a likely bug`, event);
                    }
                }

                const improperlyLinkedUser = [...externals.links.entries()]
                    .flatMap(([user, others]) => others.size > 0 ? [user, ...others] : [])
                    .find(u => !joined.has(u));
                
                if (improperlyLinkedUser) {
                    throw new ValidationError(`User ${improperlyLinkedUser} was linked even though they weren't in the ring`, event);
                }
            }

            for (const branch of externals.visitedBranches) {
                allBranchesVisited.add(branch);
            }

            inputs.add(dataString);
            progressBar.increment();
        })
        .beforeEach(() => externals.reset()),
        { numRuns: options.numRuns, skipEqualValues: true },
    );

    progressBar.stop();

    if (result.error && result.errorInstance instanceof ValidationError) {
        console.error('🛑 Validation Failed!');
        console.error(`\t${result.errorInstance.message}`);
        if (result.counterexample) {
            let [[events, params]] = result.counterexample;
            events = events.slice(0, events.indexOf(result.errorInstance.event) + 1);
            console.error('Caused by the following event sequence:');

            console.error(`\t${events.map(e => {
                const args = e.args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, jsonReplacer) : arg);
                return `${e.event}(${args.join(', ')})`;
            }).join(' ')}`);

            if (Object.keys(params).length > 0) {
                console.error('With the following parameters:');
                console.error(
                    Object.entries(params)
                        .map(([name, value]) => `\t${name}: ${JSON.stringify(value, jsonReplacer)}`)
                        .join('\n')
                );
            }
        }
        return false;
    }

    const missedBranches = [...branches.keys()].filter(x => !allBranchesVisited.has(x));
    if (missedBranches.length > 0) {
        console.error('🛑 Validation Failed!');
        for (const branch of missedBranches) {
            console.error(`\tNever visited block at ${stringifyPosition(getNodeSourceRange(branches.get(branch)!).start)}`);
        }
        console.error('ℹ If a block is impossible to reach, include a `debug BUG, "message...";` statement in it.');
        return false;
    }

    return true;
}
