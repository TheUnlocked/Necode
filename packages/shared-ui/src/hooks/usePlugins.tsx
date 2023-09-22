import { set as setMutate } from 'lodash';
import { useSnackbar } from 'notistack';
import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { isNotNull } from '~utils/typeguards';
import { ActivityDescription, ActivityManager, Feature, FeatureManager, FeatureObject, LanguageDescription, LanguageManager, Plugin } from '../../../plugin-dev/src';
import useAsyncMemo from './useAsyncMemo';
import { import_ } from '@brillout/import';
import { useApiFetch } from './useApi';
import api from '~api/handles';
import { NecodeFetchError } from './useNecodeFetch';

import * as react from 'react';
import * as muiSystem from '@mui/system';
import * as pluginDev from '@necode-org/plugin-dev';
import * as activityDev from '@necode-org/activity-dev';

// @ts-ignore
globalThis.__NECODE_PLUGIN_EXTERNALS = {
    'react': react,
    '@mui/system': muiSystem,
    '@necode-org/plugin-dev': pluginDev,
    '@necode-org/activity-dev': activityDev,
};

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
    builtinPlugins?: (new () => Plugin)[];
}

export function PluginsProvider({ children, builtinPlugins }: PluginProviderProps) {

    const { enqueueSnackbar } = useSnackbar();

    const { download } = useApiFetch();

    const dynamicPlugins = useAsyncMemo(async () => {
        try {
            const plugins = await download(api.plugins.all, { errorMessage: null });
            return Promise.all(
                plugins.map(async plugin => {
                    if (plugin.attributes.entry === undefined) {
                        return [];
                    }
                    try {
                        const pluginModule = await import_(plugin.attributes.entry);
                        return [pluginModule.default as new () => Plugin];
                    }
                    catch (e) {
                        // Failed to download a plugin.
                        console.error('Failed to load plugin', plugin.attributes.name, 'id', plugin.id, 'from', plugin.attributes.entry);
                        console.error(e);
                        return [];
                    }
                })
            ).then(x => x.flat());
        }
        catch (e) {
            if (e instanceof NecodeFetchError) {
                if (e.res.status === 401) {
                    // Not logged in, just ignore it.
                    return [];
                }
            }
            // Couldn't even fetch the plugins.
            enqueueSnackbar('Plugin API failed to load. This is a critical error.', { variant: 'error', persist: true });
            throw e;
        }
    }, [download, enqueueSnackbar]);

    const plugins = useMemo(() => [...builtinPlugins ?? [], ...dynamicPlugins ?? []], [builtinPlugins, dynamicPlugins]);
    
    const ctx = useMemo<PluginContextValue>(() => {
        const languages = new Map<string, LanguageDescription>();
        const activities = new Map<string, ActivityDescription>();
        const activityManager = new ActivityManager(activities);
        const languageManager = new LanguageManager(languages);

        const pluginObjs = plugins?.flatMap(p => {
            try {
                return [new p()];
            }
            catch (e) {
                enqueueSnackbar(`Failed to load plugin: ${e}`, { variant: 'error' });
                console.error(e);
                return [];
            }
        }) ?? [];

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
    }, [plugins, enqueueSnackbar]);

    return <pluginsContext.Provider value={ctx}>{children}</pluginsContext.Provider>;
}

export function usePlugins() {
    return useContext(pluginsContext);
}
