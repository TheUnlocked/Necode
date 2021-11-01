import RunnableLanguage from "./RunnableLanguage";

export class NoLanguage implements RunnableLanguage<undefined> {
    toRunnerCode(code: string): never {
        throw new Error("No language is specified.");
    }
}