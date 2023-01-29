import { RunnableLanguage } from '@necode-org/activity-dev';

export class NoLanguage implements RunnableLanguage<[]> {
    toRunnerCode(code: string): never {
        throw new Error("No language is specified.");
    }
}