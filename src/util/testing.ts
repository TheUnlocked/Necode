export function env(overrides: NodeJS.ProcessEnv) {
    Object.assign(process.env, overrides);
}