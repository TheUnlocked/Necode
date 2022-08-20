import NextAuth, { ISODateString } from "next-auth";
import { SitewideRights } from "@prisma/client";
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "../../../src/db/prisma";
import Email from "next-auth/providers/email";
import AzureADProvider from "next-auth/providers/azure-ad";

const WPI_TENANT_ID = process.env.MSAL_TENANT_ID;

const WPIProvider = AzureADProvider({
    id: 'wpi',
    name: 'WPI Microsoft Login',
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
});

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
        WPIProvider,
        process.env.APP_ENV === 'development' ? [
            Email({
                sendVerificationRequest: async ({ url }) => {
                    console.log(url);
                }
            })
        ] : []
    ].flat(),
    secret: process.env.NEXTAUTH_SECRET,
    adapter: (() => {
        const adapter = PrismaAdapter(prisma);
        const createUser = adapter.createUser;
        adapter.createUser = function(user) {
            if (process.env.APP_ENV === 'development') {
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
        strategy: 'database',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60, // 24 hours
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