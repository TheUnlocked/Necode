// @ts-ignore
import transformTypescript from "@babel/plugin-transform-typescript";
import createJavascriptLikeFeatures from './javascriptBase';

export default createJavascriptLikeFeatures([transformTypescript]);