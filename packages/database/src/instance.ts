import { PrismaClient } from '@prisma/client';

declare global {
    var _prisma: PrismaClient | undefined;
    var window: typeof globalThis | undefined;
};

const isBrowser = typeof window !== 'undefined';

export const prisma = isBrowser ? new Proxy({} as PrismaClient, {
    get() { throw new Error('The prisma instance is only available on the server') }
}) : global._prisma ?? new PrismaClient();

if (process.env.NEXT_PUBLIC_APP_ENV !== 'production') {
    global._prisma = prisma;
}
