import sortByProperty from "../util/sortByProperty";
import { javascriptDescription } from "./javascript";
import LanguageDescription from "./LangaugeDescription";
import { pythonDescription } from "./python3";
import { typescriptDescription } from "./typescript";

const allLanguages = sortByProperty([
    javascriptDescription,
    typescriptDescription,
    pythonDescription,
], 'name') as LanguageDescription[];

export default allLanguages;