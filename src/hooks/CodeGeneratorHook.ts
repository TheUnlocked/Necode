import { useMemo } from "react"
import RunnableLanguage from "../languages/RunnableLanguage";
import { Javascript } from "../languages/javascript";
import { NoLanguage } from "../languages/noLanguage";
import { Python3 } from "../languages/python3";
import { Typescript } from "../languages/typescript";
import FeatureDescription from "../languages/features/FeatureDescription";
import LanguageDescription from "../languages/LangaugeDescription";
import { GLSL } from "../languages/glsl";

export default function useCodeGenerator<Features extends FeatureDescription<any>[] = []>(language: string)
: RunnableLanguage<LanguageDescription<Features>> {
    return useMemo(() => {
        switch (language) {
            case 'javascript':
                return new Javascript();
            case 'typescript':
                return new Typescript();
            case 'python3':
                return new Python3();
            case 'glsl':
                return new GLSL();
            default:
                return new NoLanguage();
        }
    }, [language]) as RunnableLanguage<LanguageDescription<Features>>;
}