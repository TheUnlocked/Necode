import LanguageDescription from "./LangaugeDescription";
import RunnableLanguage from "./RunnableLanguage";

export class NoLanguage implements RunnableLanguage<LanguageDescription<[]>> {
    toRunnerCode(code: string): never {
        throw new Error("No language is specified.");
    }
}