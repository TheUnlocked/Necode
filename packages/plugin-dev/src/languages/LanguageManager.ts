import { LanguageDescription } from './LanguageDescription';

export class LanguageManager {
    /** @internal */
    constructor(private languages: Map<string, LanguageDescription>) {}

    registerLanguage(language: LanguageDescription) {
        if (this.languages.has(language.name)) {
            console.error(`Language with name ${language.name} has already been defined. Skipping.`);
            return;
        }
        this.languages.set(language.name, language);
    }
}