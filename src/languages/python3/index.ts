import { languageDescription } from '../LangaugeDescription';
import PythonIcon from '../../util/icons/PythonIcon';
import supportsGlobal from "../features/supportsGlobal";
import supportsEntryPoint from "../features/supportsEntryPoint";
import supportsIsolated from '../features/supportsIsolated';

export const pythonDescription = languageDescription({
    name: 'python3',
    monacoName: 'python',
    displayName: 'Python 3',
    icon: PythonIcon,
    features: [
        supportsEntryPoint,
        supportsGlobal,
        supportsIsolated
    ] as const,
    runnable: async () => new (await import('./impl')).default() as any,
});
