declare namespace NodeJS {
    interface ProcessEnv {
        readonly NEXT_PUBLIC_APP_ENV?: 'production' | 'development';
    }
}
