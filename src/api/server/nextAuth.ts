import { ISODateString, NextAuthOptions, User } from "next-auth";
import { SitewideRights } from "@prisma/client";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "../../../src/db/prisma";
import Credentials from 'next-auth/providers/credentials';
import { OAuthConfig, OAuthUserConfig } from 'next-auth/providers';

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

interface WPIProfile {
    businessPhones: string[],
    displayName: string,
    givenName: string,
    jobTitle: string
    mail: string,
    mobilePhone: null,
    officeLocation: null,
    preferredLanguage: null,
    surname: string,
    userPrincipalName: string,
    id: string
}

function WPIProvider({ authorization, token, tenantId, ...rest }: OAuthUserConfig<WPIProfile> & { tenantId: string }): OAuthConfig<WPIProfile> {
    return {
        id: 'wpi',
        name: 'WPI Login',
        type: 'oauth',
        version: '2.0',
        authorization: {
            url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?response_type=code&response_mode=query`,
            params: {
                scope: 'https://graph.microsoft.com/user.read',
                ...typeof authorization === 'string' ? undefined : authorization?.params,
            },
            ...typeof authorization === 'string' ? { url: authorization } : authorization,
        },
        token: {
            url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            params: {
                grant_type: 'authorization_code',
                ...typeof token === 'string' ? {} : token?.params,
            },
            ...typeof token === 'string' ? { url: token } : token,
        },
        userinfo: 'https://graph.microsoft.com/v1.0/me/',
        ...rest,
    };
}

export const nextAuthOptions: NextAuthOptions = {
    providers: [
    WPIProvider({
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
            clientId: process.env.MSAL_APPLICATION_ID!,
            clientSecret: process.env.MSAL_CLIENT_SECRET!,
            tenantId: process.env.MSAL_TENANT_ID!,
        }),
        ...process.env.NEXT_PUBLIC_APP_ENV === 'development' ? [
            Credentials({
                id: 'dev_credentials',
                name: 'Username/Password (DEV ONLY)',
                credentials: {
                    username: { label: "Username", type: "text", placeholder: 'admin' },
                    password: { label: "Password", type: "password" },
                },
                async authorize(credentials, req): Promise<User | null> {
                    if (credentials && credentials.password === process.env.DEV_PASSWORD) {
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
                user.username ??= 'dev_credentials_' + user.id;
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
                    user: token as User,
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