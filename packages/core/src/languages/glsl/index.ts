import { FeatureImplRecord } from '@necode-org/plugin-dev';
import injectionCode from "raw-loader!./inject.js.raw";

export default {
    "is/glsl": {
        getJsCodeObjectSource(code) {
            return injectionCode.replace('__GLSL_USER_INPUT_SOURCE__', JSON.stringify(code));
        },
    },
} satisfies FeatureImplRecord<[
    'is/glsl',
]>;
