import NextAuth, { ISODateString, User } from "next-auth";
import { CredentialInput, CredentialsConfig, OAuthConfig, Provider } from "next-auth/providers";
import { SitewideRights } from "@prisma/client";
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { nanoid } from "nanoid";
import { prisma } from "../../../src/db/prisma";

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

const DevProvider: CredentialsConfig<{
    username: CredentialInput,
    rights: CredentialInput,
    [key: string]: CredentialInput
}> = {
    id: "dev",
    name: "Developer Login",
    type: "credentials",
    credentials: {
        username: {},
        rights: {}
    },
    async authorize(credentials) {
        const user = credentials.username || nanoid(8);
        return {
            id: `DEV_${user}`,
            username: `dev_${user}`,
            displayName: user,
            firstName: 'Developer',
            lastName: user,
            email: `dev_${user}@wpi.edu`,
            rights: credentials.rights
        } as User;
    }
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
        process.env.NODE_ENV === 'development' ? [DevProvider] : []
    ].flat(),
    secret: process.env.NEXTAUTH_SECRET,
    adapter: PrismaAdapter(prisma),
    session: {
        jwt: false,
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60, // 24 hours
    },
    callbacks: {
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