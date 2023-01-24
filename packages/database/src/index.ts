import { PrismaClient } from "@prisma/client";
export * from "@prisma/client";

declare global {
    var _prisma: PrismaClient | undefined;
};

export const prisma = global._prisma || new PrismaClient();

if (process.env.NEXT_PUBLIC_APP_ENV !== 'production') {
    global._prisma = prisma;
}
