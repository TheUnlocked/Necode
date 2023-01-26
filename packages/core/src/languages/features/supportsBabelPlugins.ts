import FeatureDescription from "./FeatureDescription";
import type { PluginObj } from '@babel/core';
import type * as BabelCoreNamespace from '@babel/core';

const supportsBabelPlugins: FeatureDescription<{
    babelPlugins?: ((babel: typeof BabelCoreNamespace) => PluginObj)[];
}> = {
    name: 'supports:babelPlugin'
};

export default supportsBabelPlugins;