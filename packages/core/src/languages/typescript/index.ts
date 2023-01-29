import { languageDescription } from "@necode-org/activity-dev";
import TypescriptIcon from "../../icons/TypescriptIcon";
import supportsGlobal from "../features/supportsGlobal";
import supportsIsolated from "../features/supportsIsolated";
import supportsEntryPoint from "../features/supportsEntryPoint";
import supportsBabelPlugins from "../features/supportsBabelPlugins";
import isTypescript from '../features/isTypescript';

export const typescriptDescription = languageDescription({
    name: 'typescript',
    monacoName: 'typescript',
    displayName: 'TypeScript',
    icon: TypescriptIcon,
    features: [
        supportsEntryPoint,
        supportsGlobal,
        supportsIsolated,
        supportsBabelPlugins,
        isTypescript,
    ] as const,
    runnable: async () => new (await import('./impl')).default() as any,
});

