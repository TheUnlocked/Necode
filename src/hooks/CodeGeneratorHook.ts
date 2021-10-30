import { useMemo } from "react"
import ILanguage from "../languages/ILanguage";
import { Javascript } from "../languages/javascript";
import { NoLanguage } from "../languages/noLanguage";
import { Python3 } from "../languages/python3";
import { SupportedLanguage } from "../languages/supportedLanguages";
import { Typescript } from "../languages/typescript";

export default function useCodeGenerator(language: SupportedLanguage): ILanguage<any> {
    return useMemo(() => {
        switch (language) {
            case 'javascript':
                return new Javascript();
            case 'typescript':
                return new Typescript();
            case 'python3':
                return new Python3();
            default:
                return new NoLanguage();
        }
    }, [language]);
}