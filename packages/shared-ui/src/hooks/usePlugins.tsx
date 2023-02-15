import { set as setMutate } from 'lodash';
import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { isNotNull } from '~utils/typeguards';
import { ActivityDescription, ActivityManager, Feature, FeatureManager, FeatureObject, LanguageDescription, LanguageManager, Plugin } from '../../../plugin-dev/src';

export interface PluginContextValue {
    languages: LanguageDescription[];
    getLanguage(name: string | undefined): LanguageDescription | undefined;
    activities: ActivityDescription[];
    getActivity(name: string | undefined): ActivityDescription | undefined;
    getLanguagesWithFeatures(features: readonly Feature[]): LanguageDescription[];
    hasFeature(language: string | undefined, feature: Feature): boolean;
    getFeatureImpl<Fs extends readonly Feature[]>(language: string | undefined, features: Fs): Promise<FeatureObject<Fs>> | undefined;
}

const pluginsContext = createContext<PluginContextValue>({
    languages: [],
    getLanguage: () => undefined,
    activities: [],
    getActivity: () => undefined,
    getLanguagesWithFeatures: () => [],
    hasFeature: () => false,
    getFeatureImpl: () => undefined,
});

export interface PluginProviderProps extends PropsWithChildren {
    plugins: (new () => Plugin)[];
}

export function PluginsProvider({ plugins, children }: PluginProviderProps) {
    const ctx = useMemo<PluginContextValue>(() => {
        const languages = new Map<string, LanguageDescription>();
        const activities = new Map<string, ActivityDescription>();
        const activityManager = new ActivityManager(activities);
        const languageManager = new LanguageManager(languages);

        const pluginObjs = plugins.map(p => new p());

        for (const plugin of pluginObjs) {
            plugin.registerLanguages?.(languageManager);
            plugin.registerActivities?.(activityManager);
        }

        const featureManager = new FeatureManager(languages.keys());
        for (const plugin of pluginObjs) {
            plugin.registerFeatures?.(featureManager);
        }

        return {
            languages: [...languages.values()],
            getLanguage: name => languages.get(name!),
            activities: [...activities.values()],
            getActivity: name => activities.get(name!),
            getLanguagesWithFeatures: features => [...featureManager.languageMap]
                .filter(([, entry]) => features.every(f => entry.currentFeatures.has(f)))
                .map(([name]) => languages.get(name)!),
            hasFeature: (language, feature) => featureManager.languageMap.get(language!)?.currentFeatures.has(feature) ?? false,
            getFeatureImpl(language, features) {
                const entry = featureManager.languageMap.get(language!);
                if (entry && features.every(x => entry.currentFeatures.has(x))) {
                    const implCallbacks = features.map(x => entry.impl[x] ? [x, entry.impl[x]] as const : undefined);
                    if (implCallbacks.every(isNotNull)) {
                        return Promise.all(
                            implCallbacks.map(async ([name, fn]) => [name, await fn!()] as const)
                        ).then(result => {
                            const obj = {};
                            for (const [name, impl] of result) {
                                setMutate(obj, name.replaceAll('/', '.'), impl);
                            }
                            return obj as any;
                        });
                    }
                }
            },
        };
    }, [plugins]);

    return <pluginsContext.Provider value={ctx}>{children}</pluginsContext.Provider>;
}

export function usePlugins() {
    return useContext(pluginsContext);
}
