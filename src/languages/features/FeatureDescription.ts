export default interface FeatureDescription<ConfigConstraint> {
    name: string;
}

export type ConstraintOf<T extends FeatureDescription<any>> =
    T extends FeatureDescription<infer C> ? C : never;

export type ConstraintsOf<T extends FeatureDescription<any>[]> =
    T extends [infer F, ...infer Rest]
    ? Rest extends FeatureDescription<any>[]
        ? F extends FeatureDescription<any> ? ConstraintOf<F> & ConstraintsOf<Rest> : ConstraintsOf<Rest>
        : F extends FeatureDescription<any> ? ConstraintOf<F> : {}
    : {};