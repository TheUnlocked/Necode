import { FeatureDescription } from '@necode-org/activity-dev';
import type { PluginObj } from '@babel/core';
import type * as BabelCoreNamespace from '@babel/core';

const supportsBabelPlugins: FeatureDescription<{
    babelPlugins?: ((babel: typeof BabelCoreNamespace) => PluginObj)[];
}> = {
    name: 'supports:babelPlugin'
};

export default supportsBabelPlugins;