import { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

interface AzureProfile {
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

export function AzureProvider({ authorization, token, tenantId, ...rest }: OAuthUserConfig<AzureProfile> & { tenantId: string, profile: NonNullable<OAuthUserConfig<AzureProfile>['profile']> }): OAuthConfig<AzureProfile> {
    return {
        id: 'azure',
        name: 'Microsoft',
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