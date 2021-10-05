import NextAuth, { ISODateString, User } from "next-auth";
import { CredentialInput, CredentialsConfig, OAuthConfig, Provider } from "next-auth/providers";
import GithubProvider from "next-auth/providers/github"
import { SitewideRights } from "@prisma/client";
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { nanoid } from "nanoid";
import { prisma } from "../../../src/db/prisma";
import Email from "next-auth/providers/email";

const WPI_TENANT_ID = process.env.MSAL_TENANT_ID;

const WPIProvider: OAuthConfig<{
    id: string,
    displayName: string,
    givenName: string,
    surname: string,
    mail: string
}> = {
    id: 'wpi',
    name: 'WPI Microsoft Login',
    type: 'oauth',
    version: '2.0',
    authorization: {
        url: `https://login.microsoftonline.com/${WPI_TENANT_ID}/oauth2/v2.0/authorize?response_type=code&response_mode=query`,
        params: {
            scope: 'https://graph.microsoft.com/user.read',
        }
    },
    token: {
        url: `https://login.microsoftonline.com/${WPI_TENANT_ID}/oauth2/v2.0/token`,
        params: {
            grant_type: 'authorization_code'
        },
    },
    userinfo: 'https://graph.microsoft.com/v1.0/me/',
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
    tenantId: WPI_TENANT_ID
};

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

export default NextAuth({
    providers: [
        [WPIProvider as Provider],
        process.env.NODE_ENV === 'development' ? [
            Email({ 
                sendVerificationRequest: async ({ url }) => {
                    console.log(url);
                }
            }),
            GithubProvider({
                clientId: process.env.GITHUB_ID,
                clientSecret: process.env.GITHUB_SECRET,
                profile(profile: {}) {
                    // ts type assertion
                    function _(_: any): asserts _ is { id: string, name?: string, login: string, email: string, image: string } {};
                    _(profile);
                    return {
                        id: profile.id,
                        username: profile.login,
                        displayName: profile.name || profile.login,
                        firstName: "Github",
                        lastName: profile.login,
                        email: profile.email || `${profile.login}@example.edu`,
                        rights: "None",
                    };
                }
            })
        ] : []
    ].flat(),
    secret: process.env.NEXTAUTH_SECRET,
    adapter: (() => {
        const adapter = PrismaAdapter(prisma);
        const createUser = adapter.createUser;
        adapter.createUser = function(user) {
            if (process.env.NODE_ENV === 'development') {
                user.username ??= (user.email as string).split('@', 1)[0];
                user.displayName ??= user.username;
                user.firstName ??= 'dev';
                user.lastName ??= user.username;
            }
            return createUser.call(this, user);
        }
        return adapter;
    })(),
    session: {
        jwt: false,
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60, // 24 hours
    },
    jwt: {
        signingKey: process.env.JWT_SIGNING_PRIVATE_KEY
    },
    callbacks: {
        // async jwt({ token, user }) {
        //     Object.assign(token, user ?? {});
        //     return token;
        // },
        async session({ session, user }) {
            return {
                user,
                expires: session.expires
            };
        }
    },
    pages: {
        error: '/login'
    }
});