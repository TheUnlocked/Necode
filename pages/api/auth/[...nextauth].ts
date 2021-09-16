import NextAuth from "next-auth";
import { Provider } from "next-auth/providers";
import { PrismaClient } from "@prisma/client";
import { JWT } from "next-auth/jwt";

const WPI_TENANT_ID = process.env.MSAL_TENANT_ID;

const WPIProvider: Provider = {
    id: 'wpi',
    name: 'WPI Microsoft Login',
    type: 'oauth',
    version: '2.0',
    scope: 'https://graph.microsoft.com/user.read',
    params: { grant_type: 'authorization_code' },
    accessTokenUrl: `https://login.microsoftonline.com/${WPI_TENANT_ID}/oauth2/v2.0/token`,
    authorizationUrl: `https://login.microsoftonline.com/${WPI_TENANT_ID}/oauth2/v2.0/authorize?response_type=code&response_mode=query`,
    profileUrl: 'https://graph.microsoft.com/v1.0/me/',
    profile: profile => {
        return {
            id: profile.id as string,
            authId: profile.id,
            displayName: profile.displayName as string,
            firstName: profile.givenName,
            lastName: profile.surname,
            email: profile.mail as string,
        };
    },
    clientId: process.env.MSAL_APPLICATION_ID!,
    clientSecret: process.env.MSAL_CLIENT_SECRET!,
    tenantId: WPI_TENANT_ID
};

const prisma = new PrismaClient();

export default NextAuth({
    providers: [
        WPIProvider
    ],
    secret: process.env.NEXTAUTH_SECRET,
    jwt: {
        secret: process.env.NEXTAUTH_SECRET,
        signingKey: process.env.JWT_SIGNING_PRIVATE_KEY,
    },
    callbacks: {
        jwt(token, user) {
            token.firstName ??= user?.firstName;
            token.lastName ??= user?.lastName;
            return token;
        },
        session(session, token: JWT) {
            session.user = {
                ...session.user,
                firstName: token.firstName,
                lastName: token.lastName,
                email: token.email,
                username: token.email?.split('@', 1)[0]
            } as any;
            return session;
        }
    },
    // adapter: {
    //     async getAdapter() {
    //         return {
    //             createSession(user) {
    //                 prisma
    //             }
    //         }
    //     }
    // }
});