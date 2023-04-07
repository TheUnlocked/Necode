export type PolicyValidatorConfig = AtLeastOneOf<SingleValidatorConfig>;

interface SingleValidatorConfig {
    readonly params?: AtLeastOneOf<Values>;
    readonly signal?: AtLeastOneOf<SignalInfo>;
}

export interface SignalInfo {
    type: AtLeastOneOf<string>;
    data: AtLeastOneOf<Values>;
}

export type Values = { [name: string]: AtLeastOneOf<Value> };

export type Value = NumberExact | NumberRange | String | Boolean;

export type AtLeastOneOf<T> = T | [T, ...T[]];

interface NumberExact {
    type: 'int' | 'float';
    value: AtLeastOneOf<number>;
}

interface NumberRange {
    type: 'int' | 'float';
    ge: number;
    le: number;
}

interface String {
    type: 'string';
    value: AtLeastOneOf<string>;
}

interface Boolean {
    type: 'boolean';
    value?: boolean;
}
