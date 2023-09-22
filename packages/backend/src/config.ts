import { prisma } from "~database/src";

interface ConfigurationSettings {
    default: string;
    writeOnly: boolean;
}

function config(settings?: Partial<ConfigurationSettings>): ConfigurationSettings {
    return Object.assign({
        default: '',
        writeOnly: false,
    } satisfies ConfigurationSettings, settings);
}

export const configOptions = {
    'auth.azure.loginName': config({ default: 'Microsoft' }),
    'auth.azure.tenantId': config(),
    'auth.azure.clientId': config(),
    'auth.azure.clientSecret': config({ writeOnly: true }),
} as const;

export async function getConfigValue(key: keyof typeof configOptions) {
    const result = await prisma.systemConfiguration.findUnique({
        where: { key },
        select: { value: true },
    });
    return result?.value ?? configOptions[key].default;
}

export async function getConfigValues<T extends (keyof typeof configOptions)[]>(...options: T): Promise<{ [key in T[number]]: string }> {
    const result = await prisma.systemConfiguration.findMany({
        where: { key: { in: options } },
        select: { key: true, value: true },
    });
    return Object.fromEntries(result.map(r => [r.key, r.value])) as any;
}
