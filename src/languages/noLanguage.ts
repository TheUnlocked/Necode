import ILanguage from "./ILanguage";

export class NoLanguage implements ILanguage<undefined> {
    toRunnerCode(code: string): never {
        throw new Error("No language is specified.");
    }
}