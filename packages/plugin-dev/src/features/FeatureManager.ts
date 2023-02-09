import TotalMap from '~utils/maps/TotalMap';
import { Feature, FeatureMap, FeatureObject } from '~shared-ui/types/Feature';
import { zipObjectDeep } from 'lodash';

export type FeatureImplRecord<Fs extends readonly Feature[]> = { [F in Fs[number]]: FeatureMap[F] };

interface FeatureDefinition<Deps extends readonly Feature[] = readonly Feature[]> {
    name: Feature;
    language: string | null | undefined;
    dependencies: Deps;
    impl: (features: FeatureObject<Deps>) => Promise<FeatureMap[Feature]>;
}

class DependencyMap extends TotalMap<Feature, Set<FeatureDefinition>> {
    override getDefault(): Set<FeatureDefinition> {
        return new Set();
    }
}

interface LanguageEntry {
    currentFeatures: Set<string>;
    featureCandidates: DependencyMap;
    impl: Partial<Record<Feature, () => Promise<FeatureMap[Feature]>>>;
}

export class FeatureManager {
    /** @internal */
    languageMap = new Map<string, LanguageEntry>();
    // "Free" implementations are ones which do not depend on the language.
    // In other words, as long as a language satisfies the implementation's
    // dependencies, it gets the feature for "free".
    private freeImplMap = new DependencyMap();

    constructor(private languages: Iterable<string>) {
        for (const language of languages) {
            this.languageMap.set(language, {
                currentFeatures: new Set(),
                featureCandidates: new DependencyMap(),
                impl: {},
            });
        }
    }

    /**
     * @param language
     * The language to add the feature to. This language must be registered.
     * 
     * If null, this feature will be added to all languages which satisfy the dependencies.
     * 
     * @param feature
     * The name of the feature to add.
     * 
     * If this fails to typecheck, make sure to add the feature to the {@link FeatureMap} interface:
     * https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     * 
     * @param dependencies
     * A list of features which this feature depends on.
     * If those features are not supported, this feature will not be either.
     * 
     * @param impl
     * A callback returning the implementation for the feature.
     * Features that are depended on will be provided in the first argument to the callback.
     */
    implementFeature<F extends Feature, Deps extends readonly Feature[]>(
        language: string | null | undefined,
        feature: F,
        dependencies: Deps,
        impl: (features: FeatureObject<Deps>) => Promise<FeatureMap[F]>,
    ) {
        if (dependencies.includes(feature)) {
            console.error('Cannot implement a feature which depends on itself. Skipping.');
            return;
        }

        const featureDef: FeatureDefinition = {
            name: feature,
            language,
            dependencies,
            impl: impl as (features: FeatureObject<any>) => Promise<FeatureMap[F]>,
        };
        
        if (language == null) {
            for (const language of this.languages) {
                const languageEntry = this.languageMap.get(language)!;
                this.tryImplementFreeFeature(languageEntry, featureDef);
            }
            this.saveFeatureCandidate(this.freeImplMap, featureDef);
        }
        else {
            const languageEntry = this.languageMap.get(language);
            if (!languageEntry) {
                console.error(`Attempted to add feature ${JSON.stringify(feature)} to unregistered language ${JSON.stringify(language)}`);
                return;
            }
            if (dependencies.every(dep => languageEntry.currentFeatures.has(dep))) {
                this.implement(languageEntry, featureDef as FeatureDefinition<any>);
            }
            else {
                this.saveFeatureCandidate(languageEntry.featureCandidates, featureDef);
            }
        }
    }

    implementFeatures<Fs extends readonly Feature[], Deps extends readonly Feature[]>(
        language: string | null | undefined,
        features: Fs,
        dependencies: Deps,
        impl: (features: FeatureObject<Deps>) => Promise<FeatureImplRecord<Fs>>,
    ) {
        let implPromise: ReturnType<typeof impl>;

        for (const feature of features) {
            this.implementFeature(language, feature, dependencies, async obj => {
                implPromise ??= impl(obj);
                return (await implPromise)[feature as Fs[number]];
            });
        }
    }

    private saveFeatureCandidate(map: DependencyMap, feature: FeatureDefinition) {
        for (const dep of feature.dependencies) {
            map.get(dep).add(feature);
        }
    }

    private checkFeatureCandidates(languageEntry: LanguageEntry, newFeature: Feature) {
        const languageFeatureCandidates = languageEntry.featureCandidates.get(newFeature);
        for (const candidate of languageFeatureCandidates) {
            if (candidate.dependencies.every(dep => languageEntry.currentFeatures.has(dep))) {
                languageFeatureCandidates.delete(candidate);
                this.implement(languageEntry, candidate);
            }
        }
        for (const candidate of this.freeImplMap.get(newFeature)) {
            this.tryImplementFreeFeature(languageEntry, candidate);
        }
    }

    private tryImplementFreeFeature(languageEntry: LanguageEntry, candidate: FeatureDefinition) {
        // To avoid infinite cycles and to give priority to language-specific impls,
        // we don't want to implement free features if the language already has that feature.
        // This is not an issue for language-specific feature impls since we delete
        // the candidate after adding it, but we can't do that for free features.
        if (!languageEntry.currentFeatures.has(candidate.name) &&
            candidate.dependencies.every(dep => languageEntry.currentFeatures.has(dep))
        ) {
            this.implement(languageEntry, candidate);
        }
    }

    private implement(
        languageEntry: LanguageEntry,
        feature: FeatureDefinition,
    ) {
        // We want to store the dependency implementations now so that
        // we don't end up with cycles down the line.
        // This is okay because all feature implementations should have
        // identical semantics, though it's possible that there could
        // be a minor performance penalty in some cases where a specialized
        // implementation is not used even when it technically could be.
        const deps = feature.dependencies;
        const depImplFns = deps.map(x => languageEntry.impl[x]!);
        languageEntry.impl[feature.name] = async () => {
            return feature.impl(
                zipObjectDeep(
                    deps.map(x => x.replaceAll('/', '.')),
                    await Promise.all(depImplFns.map(x => x())),
                ) as any
            );
        };
        if (!languageEntry.currentFeatures.has(feature.name)) {
            // No need to check for candidate features if this feature was already supported.
            // In fact, doing so could run into infinite recursion issues if there were cycles.
            // We still want to use this implementation since language-specific implementations
            // should override free features.
            languageEntry.currentFeatures.add(feature.name);
            this.checkFeatureCandidates(languageEntry, feature.name);
        }
    }
}