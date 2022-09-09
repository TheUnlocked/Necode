import RunnableLanguage from "./RunnableLanguage";

export class NoLanguage implements RunnableLanguage<[]> {
    toRunnerCode(code: string): never {
        throw new Error("No language is specified.");
    }
}