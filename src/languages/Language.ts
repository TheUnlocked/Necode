// to be written, probably not here
function run(code: string) {
    return null! as Result;
}

export default abstract class Language<TFeatureImpl> {
    readonly supportedFeatures = new Set<string>();
    
    private featureImpls = new Map<string, (context: any) => TFeatureImpl>();

    constructor(private runnerFactory: IRunnerProvider) {}

    addFeature(featureName: string, impl: (context: any) => TFeatureImpl) {
        this.supportedFeatures.add(featureName);
        this.featureImpls.set(featureName, impl);
    }

    run(code: string, featureContext: { [featureName: string]: any }): Result {
        return this.runnerFactory.use(runner => runner.run(this.toRunnerCode(
            code,
            Object.entries(featureContext)
                .map(([feature, context]) => this.featureImpls.get(feature)?.(context))
                .filter(((x): x is TFeatureImpl => x != null))
        )));
    }

    abstract toRunnerCode(userCode: string, providers: TFeatureImpl[]): string;
}

export type Result = SuccessResult | ErrorResult;

interface SuccessResult {
    type: 'success';
    result: string;
}

interface ErrorResult {
    type: 'error';
    name: string;
    message: string;
    trace?: string;
}