import { UnionToIntersection } from '~utils/types';

export interface FeatureMap {
    'requires/browser': {
        isCompatible(): boolean;
        getRecommendedBrowsers(): string[];
    };
    'requires/setup': {
        setup(): Promise<void>;
    };
    'iframe/static': {
        getDownloadableAssetURIs(): readonly string[];
        compile(code: string): Promise<string>;
    };
    'worker/static': {
        compile(code: string): Promise<string>;
    };
    'evaluate/string': {
        evaluate(code: string): Promise<string>;
    };
    'evaluate/any': {
        evaluate<T>(code: string): Promise<T>;
    };
    'evaluate/any/sync': {
        evaluate<T>(code: string): T;
    };
    'entryPoint/void': {
        entryPoint(code: string, name: string): () => Promise<void>;
    };
    'entryPoint/string': {
        entryPoint(code: string, name: string): (input: string) => Promise<string>;
    };
    'entryPoint/any': {
        entryPoint<Args extends any[], R>(code: string, name: string): (...args: Args) => Promise<R>;
    };
    'entryPoint/any/sync': {
        entryPoint<Args extends any[], R>(code: string, name: string): (...args: Args) => R;
    };
    'repl/global': {
        evaluate(code: string): Promise<string[]>;
    };
    'repl/global/evalSync': {
        evaluate(code: string): string[];
    };
    'repl/instanced': {
        createInstance(): Promise<{
            evaluate(code: string): Promise<string[]>;
        }>;
    };
    'repl/instanced/startupSync': {
        createInstance(): {
            evaluate(code: string): Promise<string[]>;
        };
    };
    'repl/instanced/evalSync': {
        createInstance(): Promise<{
            evaluate(code: string): string[];
        }>;
    };
    'repl/instanced/fullSync': {
        createInstance(): {
            evaluate(code: string): string[];
        };
    };
}

export type Feature = keyof FeatureMap;

type PathToObject<F extends string, O> = F extends `${infer lhs}/${infer rest}`
    ? { [_ in lhs]: PathToObject<rest, O> }
    : { [_ in F]: O };

// using extends to force distribution.
// See https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
type _FeatureObject<F extends Feature> = F extends any ? PathToObject<F, FeatureMap[F]> : {};
export type FeatureObject<Fs extends readonly Feature[]> = UnionToIntersection<_FeatureObject<Fs[number]>>;
