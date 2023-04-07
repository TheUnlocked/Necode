import { FeatureImplRecord } from '@necode-org/plugin-dev';
import Scheme from 'chez-scheme-js';

export default {

    "requires/browser": {
        isCompatible() {
            return typeof SharedArrayBuffer !== 'undefined';
        },
        getRecommendedBrowsers() {
            return ['Chrome 96+', 'Edge 96+'];
        },
    },

    "repl/instanced": {
        async createInstance() {
            let errors = [] as string[];
            const scheme = new Scheme({
                workerUrl: new URL('./worker.js', import.meta.url),
                error: err => errors.push(err),
            });
            await scheme.init();
            return {
                evaluate: async code => {
                    try {
                        return [
                            ...(await scheme.runExpression(code)).map(x => ({ type: 'result' as const, contents: x })),
                            ...errors.flatMap(x => x.split('\n')).filter(Boolean).map(x => ({ type: 'text' as const, contents: x })),
                        ];
                    }
                    finally {
                        errors = [];
                    }
                },
                destroy: () => scheme.destroy(),
            };
        },
    },

    "evaluate/string": {
        async evaluate(code) {
            const scheme = new Scheme({
                workerUrl: new URL('./worker.js', import.meta.url),
            });
            await scheme.init();
            return (await scheme.runExpression(code)).at(-1) ?? '';
        },
    },

} satisfies FeatureImplRecord<[
    'requires/browser',
    'repl/instanced',
    'evaluate/string'
]>;