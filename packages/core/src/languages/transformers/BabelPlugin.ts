import type { PluginObj } from '@babel/core';
import type * as BabelCoreNamespace from '@babel/core';

type BabelPlugin = (babel: typeof BabelCoreNamespace) => PluginObj;

export default BabelPlugin;