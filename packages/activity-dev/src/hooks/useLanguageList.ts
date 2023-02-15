import { Feature, LanguageDescription } from '@necode-org/plugin-dev';
import { usePlugins } from '~shared-ui/hooks/usePlugins';
import { Tuple } from '~utils/types';

export default function useLanguageList(): LanguageDescription[] {
    return usePlugins().languages;
}

export function useLanguages<T extends Tuple<string, number>>(...names: T) {
    const { getLanguage } = usePlugins();
    return names.map(getLanguage) as T extends { length: infer N extends number } ? Tuple<LanguageDescription | undefined, N> : never;
}

export function useCompatibleLanguages(features: readonly Feature[]) {
    const { getLanguagesWithFeatures } = usePlugins();
    return getLanguagesWithFeatures(features);
}
