import FeatureDescription from "./features/FeatureDescription";
import { javascriptDescription } from "./javascript";
import LanguageDescription from "./LangaugeDescription";
import { pythonDescription } from "./python3";
import { typescriptDescription } from "./typescript";

const allLanguages = [
    javascriptDescription,
    typescriptDescription,
    pythonDescription,
] as LanguageDescription<FeatureDescription<any>[]>[];

export default allLanguages;