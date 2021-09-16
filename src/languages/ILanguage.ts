export default interface ILanguage<TOptions> {
    toRunnerCode(code: string, options: TOptions): string;
}
