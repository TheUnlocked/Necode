declare namespace NodeJS {
    interface ProcessEnv {
        /**
         * @availablein Next.js Backend
         * @availablein Next.js Frontend
         */
        readonly NEXT_PUBLIC_APP_ENV: 'production' | 'development';
        
        /**
         * The port that the Next.js server will be served from during production.
         * During development, the port will always be 3000, regardless of what this is set to.
         * If hosted on Vercel, this is ignored.
         * @availablein Custom Server
         */
        readonly PORT: string;
        
        /**
         * The port that the websocket server will be served from.
         * @availablein WebSocket Server
         */
        readonly WS_PORT: string;

        /**
         * The origin of the frontend server. Should not include a trailing slash.
         * @availablein WebSocket Server
         */
        readonly FRONTEND_ORIGIN?: string;

        /**
         * A regex pattern for deciding whether to allow a cross-origin request.
         * If omitted, calculates the pattern from the frontend origin. 
         * @availablein WebSocket Server
         */
        readonly WEBSOCKET_CORS_REGEX?: string;

        /**
         * The full address of the websocket server.
         * @availablein Next.js Backend
         */
        readonly WEBSOCKET_SERVER: string;

        /**
         * Whether to serve the websocket with SSL (i.e. https:// and wss://)
         * @availablein WebSocket Server
         */
        readonly USE_SSL_WEBSOCKET: string;

        /**
         * Relative paths the SSL key in PEM format. `SSL_CERT` must also be set.
         * These will be used by the Next.js server during production and the websocket server if `USE_SSL_WEBSOCKET` is enabled.
         * If hosted on Vercel, this is ignored for the Next.js server.
         * @availablein Next.js Backend
         * @availablein WebSocket Server
         */
        readonly SSL_KEY?: string;
        /**
         * Relative paths the SSL certificate in PEM format. `SSL_KEY` must also be set.
         * These will be used by the Next.js server during production and the websocket server if `USE_SSL_WEBSOCKET` is enabled.
         * If hosted on Vercel, this is ignored for the Next.js server.
         * @availablein Next.js Backend
         * @availablein WebSocket Server
         */
        readonly SSL_CERT?: string;

        /**
         * The database URL for your PostgreSQL database. It should follow the format in the template,
         * though additional query parameters may be necessary (e.g. sslmode=require for certain configurations).
         * @availablein Next.js Backend
         * @availablein WebSocket Server
         */
        readonly DATABASE_URL: string;

        /**
         * The redirect URI for oauth authentication. If using the HTTPS proxy server,
         * it should point to that instead of to where the HTTP server is being served.
         * Some services may require HTTPS, especially if not serving on localhost.
         * @availablein Next.js Backend
         */
        NEXTAUTH_URL?: string;

        /**
         * A secret for storing sessions. You should come up with your own secret,
         * preferably using some kind of secure secret generator.
         * @availablein Next.js Backend
         */
        readonly NEXTAUTH_SECRET: string;
        
        /**
         * A private key for signing JSON Web Tokens.
         * You can generate your own with `npx jose newkey -s 512 -t oct -a HS512`.
         * See https://github.com/phish108/node-jose-tools/blob/HEAD/docs/newkey.md for more information.
         * @availablein Next.js Backend
         * @availablein WebSocket Server
         */
        readonly JWT_SIGNING_PRIVATE_KEY: string;

        /**
         * The MSAL application ID. Available only when Microsoft authentication is being used.
         * @availablein Next.js Backend
         */
        readonly MSAL_APPLICATION_ID?: string;
        /**
         * The MSAL client secret. Available only when Microsoft authentication is being used.
         * @availablein Next.js Backend
         */
        readonly MSAL_CLIENT_SECRET?: string;
        /**
         * The MSAL tenant ID. Available only when Microsoft authentication is being used.
         * @availablein Next.js Backend
         */
        readonly MSAL_TENANT_ID?: string;

        /**
         * The STUN server to use for WebRTC connections, if any.
         * @availablein Next.js Backend
         */
        readonly WEBRTC_STUN_SERVER_URL?: string;
        /**
         * The TURN server to use for WebRTC connections, if any.
         * Multiple URLS can be provided separated by commas.
         * @availablein Next.js Backend
         */
        readonly WEBRTC_TURN_SERVER_URL?: string;
        /**
         * The shared secret for generating limited time credentials for the TURN server.
         * @availablein Next.js Backend
         */
        readonly WEBRTC_TURN_SECRET?: string;

        /**
         * The password for credential login.
         * @availablein Next.js Backend
         * @environment development
         */
        readonly DEV_PASSWORD?: string;
    }
}
