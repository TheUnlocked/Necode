import { languageDescription } from "../LangaugeDescription";
import JavascriptIcon from "../../util/icons/JavascriptIcon";
import supportsGlobal from "../features/supportsGlobal";
import supportsIsolated from "../features/supportsIsolated";
import supportsEntryPoint from "../features/supportsEntryPoint";
import supportsBabelPlugins from "../features/supportsBabelPlugins";

export const javascriptDescription = languageDescription({
    name: 'javascript',
    monacoName: 'javascript',
    displayName: 'JavaScript',
    icon: JavascriptIcon,
    features: [
        supportsEntryPoint,
        supportsGlobal,
        supportsIsolated,
        supportsBabelPlugins
    ] as const,
    runnable: async () => new (await import('./impl')).default() as any,
});
