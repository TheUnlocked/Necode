import { ISODateString, NextAuthOptions, User } from "next-auth";
import { SitewideRights } from "~database";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "~database";
import Credentials from 'next-auth/providers/credentials';
import { AzureProvider } from "./auth/azure";
import { getConfigValues } from "./config";

declare module 'next-auth' {
    interface Session {
        user: User;
        expires: ISODateString;
    }
    interface User {
        id: string;
        username: string;
        displayName: string;
        email: string;
        firstName: string;
        lastName: string;
        rights: SitewideRights;
    }
}

export async function getNextAuthOptions(): Promise<NextAuthOptions> {

    const azure = (async () => {
        const options = await getConfigValues(
            'auth.azure.loginName',
            'auth.azure.clientId',
            'auth.azure.tenantId',
            'auth.azure.clientSecret',
        );
        return AzureProvider({
            name: options["auth.azure.loginName"],
            profile(profile) {
                return {
                    id: profile.id,
                    username: profile.mail.split('@', 1)[0],
                    displayName: profile.displayName,
                    firstName: profile.givenName,
                    lastName: profile.surname,
                    email: profile.mail,
                    rights: "None"
                };
            },
            tenantId: options["auth.azure.tenantId"],
            clientId: options["auth.azure.clientId"],
            clientSecret: options["auth.azure.clientSecret"],
        });
    })();

    return {
        providers: [
            await azure,
            ...process.env.NEXT_PUBLIC_APP_ENV === 'development' ? [
                Credentials({
                    id: 'dev_credentials',
                    name: 'Username/Password (DEV ONLY)',
                    credentials: {
                        username: { label: "Username", type: "text", placeholder: 'e.g. admin' },
                        password: { label: "Password", type: "password" },
                    },
                    async authorize(credentials, req): Promise<User | null> {
                        if (credentials?.username && credentials.password === process.env.DEV_PASSWORD) {
                            const username = `@dev_` + credentials.username;
                            return await prisma.user.upsert({
                                where: { username },
                                create: {
                                    username,
                                    displayName: credentials.username,
                                    firstName: 'Dev',
                                    lastName: credentials.username,
                                    email: `${credentials.username}-noreply@necode.invalid`,
                                    rights: 'None',
                                },
                                update: {},
                            });
                        }
                        return null;
                    },
                })
            ] : []
        ],
        secret: process.env.NEXTAUTH_SECRET,
        adapter: (() => {
            const adapter = PrismaAdapter(prisma);
            const createUser = adapter.createUser;
            adapter.createUser = function(user) {
                if (process.env.NEXT_PUBLIC_APP_ENV === 'development') {
                    user.username ??= 'dev_credentials_' + (user as any).id;
                    user.displayName ??= user.username;
                    user.firstName ??= 'dev';
                    user.lastName ??= user.username;
                }
                return createUser.call(this, user);
            };
            return adapter;
        })(),
        session: {
            strategy: process.env.NEXT_PUBLIC_APP_ENV === 'development' ? 'jwt' : 'database',
            maxAge: 30 * 24 * 60 * 60, // 30 days
            updateAge: 24 * 60 * 60, // 24 hours
        },
        callbacks: {
            jwt: process.env.NEXT_PUBLIC_APP_ENV === 'development' ? async ({ token, user }) => {
                return { ...token, ...user };
            } : undefined,
            async session({ session, user, token }) {
                if (process.env.NEXT_PUBLIC_APP_ENV === 'development') {
                    return {
                        user: token as unknown as User,
                        expires: session.expires
                    };
                }
                return {
                    user,
                    expires: session.expires
                };
            }
        },
        pages: {
            error: '/login'
        }
    };
};