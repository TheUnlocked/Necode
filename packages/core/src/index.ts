import { Code } from '@mui/icons-material';
import { ActivityManager, FeatureManager, LanguageManager, Plugin } from '@necode-org/plugin-dev';
import canvasActivityDescription from './activities/canvas';
import glslActivityDescription from './activities/glsl';
import p5jsActivityDescription from './activities/p5js';
import p5jsRingActivityDescription from './activities/p5-canvas';
import { testDomActivityDescription, testDomActivityNetworkedDescription } from './activities/test-dom';
import textInputActivityDescription from './activities/text-input/textInputDescription';
import JavascriptIcon from './icons/JavascriptIcon';
import MarkdownIcon from './icons/MarkdownIcon';
import PythonIcon from './icons/PythonIcon';
import TypescriptIcon from './icons/TypescriptIcon';
import BabelPlugin from './languages/transformers/BabelPlugin';

declare module '@necode-org/plugin-dev' {
    interface FeatureMap {
        'js/babel': {
            compileToJs(code: string, plugins: BabelPlugin[]): Promise<string | undefined>;
        };
        'is/glsl': {
            getJsCodeObjectSource(code: string): string;
        };
    }
}

async function defaultOf<T extends { default: any }>(module: Promise<T>): Promise<T['default']> {
    return (await module).default;
}

function asyncify<Args extends any[], R>(fn: (...args: Args) => R) {
    return async (...args: Args) => {
        return fn(...args);
    };
}

export default class CorePlugin extends Plugin {

    override registerActivities(manager: ActivityManager): void {
        manager.registerActivity(canvasActivityDescription);
        manager.registerActivity(testDomActivityDescription);
        manager.registerActivity(testDomActivityNetworkedDescription);
        manager.registerActivity(p5jsActivityDescription);
        manager.registerActivity(p5jsRingActivityDescription);
        manager.registerActivity(glslActivityDescription);
        manager.registerActivity(textInputActivityDescription);
    }

    override registerLanguages(manager: LanguageManager): void {

        manager.registerLanguage({
            name: 'plaintext',
            monacoName: 'plaintext',
            displayName: 'Plain Text',
            icon: Code,
        });

        manager.registerLanguage({
            name: 'html',
            monacoName: 'html',
            displayName: 'HTML',
        });

        manager.registerLanguage({
            name: 'css',
            monacoName: 'css',
            displayName: 'CSS'
        });

        manager.registerLanguage({
            name: 'markdown',
            monacoName: 'markdown',
            displayName: 'Markdown',
            icon: MarkdownIcon,
        });

        manager.registerLanguage({
            name: 'javascript',
            monacoName: 'javascript',
            displayName: 'JavaScript',
            icon: JavascriptIcon,
        });

        manager.registerLanguage({
            name: 'typescript',
            monacoName: 'typescript',
            displayName: 'TypeScript',
            icon: TypescriptIcon,
        });

        manager.registerLanguage({
            name: 'python3',
            monacoName: 'python',
            displayName: 'Python 3',
            icon: PythonIcon,
        });

        manager.registerLanguage({
            name: 'glsl',
            monacoName: 'c',
            displayName: 'GLSL',
        });

    }
    
    override registerFeatures(manager: FeatureManager): void {

        manager.implementFeature(null, 'entryPoint/any', ['entryPoint/any/sync'], async obj => ({
            entryPoint: (code, name) => asyncify(obj.entryPoint.any.sync.entryPoint(code, name)),
        }));

        manager.implementFeatures(
            null,
            ['entryPoint/void', 'entryPoint/string'],
            ['entryPoint/any'],
            async obj => ({
                'entryPoint/void': { entryPoint: (obj.entryPoint.any.entryPoint)<[], void> },
                'entryPoint/string': { entryPoint: (obj.entryPoint.any.entryPoint)<[string], string> },
            })
        );

        manager.implementFeature(null, 'evaluate/any', ['evaluate/any/sync'], async obj => ({
            evaluate: async code => obj.evaluate.any.sync.evaluate(code),
        }));

        manager.implementFeature(null, 'evaluate/string', ['evaluate/any'], async obj => ({
            evaluate: obj.evaluate.any.evaluate,
        }));

        manager.implementFeatures(
            null,
            ['repl/instanced/startupSync', 'repl/instanced/evalSync'],
            ['repl/instanced/fullSync'],
            async obj => ({
                "repl/instanced/startupSync": {
                    createInstance: () => {
                        const instance = obj.repl.instanced.fullSync.createInstance();
                        return { evaluate: async code => instance.evaluate(code) };
                    },
                },
                "repl/instanced/evalSync": {
                    createInstance: async () => obj.repl.instanced.fullSync.createInstance(),
                },
            })
        );
        manager.implementFeature(null, 'repl/instanced', ['repl/instanced/startupSync'], async obj => ({
            createInstance: async () => obj.repl.instanced.startupSync.createInstance(),
        }));
        manager.implementFeature(null, 'repl/instanced', ['repl/instanced/evalSync'], async obj => ({
            createInstance: async () => {
                const instance = await obj.repl.instanced.evalSync.createInstance();
                return { evaluate: async code => instance.evaluate(code) };
            },
        }));
        manager.implementFeature(null, 'repl/global/evalSync', ['repl/instanced/evalSync'], obj => obj.repl.instanced.evalSync.createInstance());
        manager.implementFeature(null, 'repl/global', ['repl/instanced'], obj => obj.repl.instanced.createInstance());
        manager.implementFeature(null, 'repl/global', ['repl/global/evalSync'], async obj => ({
            evaluate: async code => obj.repl.global.evalSync.evaluate(code),
        }));

        manager.implementFeatures(
            'javascript',
            [
                'entryPoint/any/sync',
                'evaluate/any/sync',
                'evaluate/any',
                'iframe/static',
                'worker/static',
                'repl/instanced/fullSync',
                'js/babel',
            ],
            [],
            () => defaultOf(import('./languages/javascript'))
        );

        manager.implementFeatures(
            'typescript',
            [
                'entryPoint/any/sync',
                'evaluate/any/sync',
                'evaluate/any',
                'iframe/static',
                'worker/static',
                'repl/instanced/fullSync',
                'js/babel',
            ],
            [],
            () => defaultOf(import('./languages/typescript'))
        );

        manager.implementFeatures(
            'python3',
            [
                'requires/setup',
                'entryPoint/any',
                'evaluate/any',
                'iframe/static',
                'worker/static',
                'repl/instanced/fullSync',
            ],
            [],
            () => defaultOf(import('./languages/python3'))
        );

        manager.implementFeatures(
            'glsl',
            ['is/glsl'],
            [],
            () => defaultOf(import('./languages/glsl'))
        );
    }

}