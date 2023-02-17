import { AtLeastOneOf, PolicyValidatorConfig, SignalInfo, Value, Values } from '~api/PolicyValidatorConfig';

export class ParseValidationConfigError extends Error {
    name = 'ParseValidationConfigError';
}

function parseAtLeastOneOf<T>(obj: unknown, parser: (obj: unknown) => T): AtLeastOneOf<T> {
    if (obj == null) {
        throw new ParseValidationConfigError(`${parser.name}: Expected at least one value, found nothing.`);
    }

    if (obj instanceof Array) {
        if (obj.length === 0) {
            throw new ParseValidationConfigError(`${parser.name}: Expected at least one value, found empty array.`);
        }

        return obj.map(parser) as AtLeastOneOf<T>;
    }

    return parser(obj);
}

function parseValue(obj: unknown): Value {
    if (typeof obj !== 'object' || obj === null) {
        throw new ParseValidationConfigError('value must be an object');
    }

    if (!('type' in obj)) {
        throw new ParseValidationConfigError("value missing 'type' field");
    }

    switch (obj.type) {
        case 'int':
        case 'float':
            if ('value' in obj) {
                const typeWithArticle = obj.type === 'int' ? 'an int' : 'a float';
                if (typeof obj.value !== 'number') {
                    throw new ParseValidationConfigError(`'value' field in type '${obj.type}' must either be missing or contain ${typeWithArticle}`);
                }
                if ('ge' in obj || 'le' in obj) {
                    throw new ParseValidationConfigError(`If ${typeWithArticle} has a value field, it must not have a 'ge'/'le' field`);
                }

                return {
                    type: obj.type,
                    value: parseAtLeastOneOf(obj.value, v => {
                        if (typeof v !== 'number') {
                            throw new ParseValidationConfigError(`'value' field in type '${obj.type}' must contain ${typeWithArticle}`);
                        }
                        if (obj.type === 'int' && v % 1 !== 0) {
                            throw new ParseValidationConfigError(`An int cannot have a decimal component`);
                        }
                        return v;
                    }),
                };
            }

            if ('ge' in obj) {
                if (!('le' in obj)) {
                    throw new ParseValidationConfigError(`A range-based value of type '${obj.type}' must contain both 'ge' and 'le' fields`);
                }

                if (typeof obj.ge !== 'number' || typeof obj.le !== 'number') {
                    throw new ParseValidationConfigError(`The 'ge'/'le' fields must both be numbers.`);
                }

                if (obj.type === 'int' && (obj.ge % 1 !== 0 || obj.le % 1 !== 0)) {
                    throw new ParseValidationConfigError(`The 'ge'/'le' fields of an int cannot have a decimal component.`);
                }

                if (obj.le < obj.ge) {
                    throw new ParseValidationConfigError(`A range-based value must have 'le' >= 'ge'.`);
                }

                return {
                    type: obj.type,
                    ge: obj.ge,
                    le: obj.le,
                };
            }
            else if ('le' in obj) {
                throw new ParseValidationConfigError(`A range-based value of type '${obj.type}' must contain both 'ge' and 'le' fields`);
            }
            else {
                throw new ParseValidationConfigError(`Type '${obj.type}' must contain either a 'value' field or 'ge' and 'le' fields`);
            }
        case 'boolean':
            if ('value' in obj) {
                if (typeof obj.value !== 'boolean') {
                    throw new ParseValidationConfigError("'value' field in type 'boolean' must either be missing or contain a boolean");
                }

                return { type: 'boolean', value: obj.value };
            }
            return { type: 'boolean' };
        case 'string':
            if (!('value' in obj)) {
                throw new ParseValidationConfigError("string value missing 'value' field");
            }
            return {
                type: 'string',
                value: parseAtLeastOneOf(obj.value, v => {
                    if (typeof v !== 'string') {
                        throw new ParseValidationConfigError("'value' field in type 'string' must contain a string");
                    }
                    return v;
                }),
            };
        default:
            throw new ParseValidationConfigError(`Invalid 'type' field: ${JSON.stringify(obj.type)}`);
    }
}

function parseValues(obj: unknown): Values {
    if (typeof obj !== 'object' || obj === null) {
        throw new ParseValidationConfigError('config.params must be an object');
    }

    return Object.fromEntries(
        (Object.keys(obj) as (keyof typeof obj)[])
            .map(k => [k, parseAtLeastOneOf(obj[k], parseValue)] as const)
    );
}

function parseSignalInfo(obj: unknown): SignalInfo {
    if (typeof obj !== 'object' || obj === null) {
        throw new ParseValidationConfigError('config.signal must be an object');
    }

    if (!('type' in obj)) {
        throw new ParseValidationConfigError('config.signal.type must exist');
    }

    if (!('data' in obj)) {
        throw new ParseValidationConfigError('config.signal.data must exist');
    }

    const type = parseAtLeastOneOf(obj.type, obj => {
        if (typeof obj !== 'string') {
            throw new ParseValidationConfigError('config.signal.type must be a string');
        }
        return obj;
    });

    return {
        type,
        data: parseAtLeastOneOf(obj.data, parseValues),
    };
}

function parseSingleValidatorConfig(obj: unknown) {
    if (typeof obj !== 'object' || obj === null) {
        throw new ParseValidationConfigError('Invalid configuration JSON');
    }

    return {
        params: 'params' in obj ? parseAtLeastOneOf(obj.params, parseValues) : undefined,
        signal: 'signal' in obj ? parseAtLeastOneOf(obj.signal, parseSignalInfo) : undefined,
    };
}

/**
 * @throws {SyntaxError} when the JSON string input fails to parse
 * @throws {ParseValidationConfigError}
 */
export default function parseValidatorConfig(json: string): PolicyValidatorConfig {
    // Allow syntax error to fall through
    const obj = JSON.parse(json) as unknown;

    return parseAtLeastOneOf(obj, parseSingleValidatorConfig);
}
