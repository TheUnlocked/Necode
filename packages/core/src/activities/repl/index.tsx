import { activityDescription } from '@necode-org/plugin-dev';


export interface Config {
    
}

export default activityDescription({
    id: 'core/repl',
    displayName: 'REPL',
    requiredFeatures: [
        'repl/instanced',
    ],
    activityPage: async () => (await import('./activity')).Activity,
    defaultConfig: {},
});
