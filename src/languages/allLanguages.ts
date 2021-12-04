import sortByProperty from "../util/sortByProperty";
import { cssDescription } from "./css";
import { glslDescription } from "./glsl";
import { htmlDescription } from "./html";
import { javascriptDescription } from "./javascript";
import LanguageDescription from "./LangaugeDescription";
import { markdownDescription } from "./markdown";
import { pythonDescription } from "./python3";
import { typescriptDescription } from "./typescript";

const allLanguages = sortByProperty([
    javascriptDescription,
    typescriptDescription,
    pythonDescription,
    htmlDescription,
    cssDescription,
    markdownDescription,
    glslDescription,
], 'name') as LanguageDescription[];

export default allLanguages;