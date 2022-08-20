declare namespace NodeJS {
    interface ProcessEnv {
        readonly APP_ENV?: 'production' | 'development';
    }
}
