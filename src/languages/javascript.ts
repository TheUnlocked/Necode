import Language from "./Language";

interface JavascriptFeatureImpl {
    /** Transforms just the user code */
    transformUserCode?: (code: string) => string;
    /** Transforms the result after all user code transformations have occurred */
    transformAfter?: (code: string) => string;
    typeDefinitions?: string;
}

class Javascript extends Language<JavascriptFeatureImpl> {
    override toRunnerCode(userCode: string, features: JavascriptFeatureImpl[]) {
        let transformedUserCode = features.reduce((acc, provider) => provider.transformUserCode?.(acc) ?? acc, userCode);
        const finalCode = features.reduce((acc, provider) => provider.transformAfter?.(acc) ?? acc, transformedUserCode);
        return finalCode;
    }
}