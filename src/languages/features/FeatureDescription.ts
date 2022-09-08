// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default interface FeatureDescription<ConfigConstraint> {
    name: string;
}

export type ConstraintOf<T extends FeatureDescription<any>> =
    T extends FeatureDescription<infer C> ? C : never;

export type ConstraintsOf<T extends readonly FeatureDescription<any>[]> =
    T extends readonly [infer F, ...infer Rest]
    ? Rest extends FeatureDescription<any>[]
        ? F extends FeatureDescription<any> ? ConstraintOf<F> & ConstraintsOf<Rest> : ConstraintsOf<Rest>
        : F extends FeatureDescription<any> ? ConstraintOf<F> : {}
    : {};