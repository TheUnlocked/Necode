const supportedLanguages = [
    'javascript',
    'typescript',
    'python3'
] as const;

export type SupportedLanguage = typeof supportedLanguages extends readonly (infer T)[] ? T : never;

export default supportedLanguages;