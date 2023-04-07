const path = require('path');

const webpack = require('webpack');

/** @type {import('webpack').Configuration} */
const config = {
    mode: 'development',
    entry: './src/index.ts',
    experiments: {
        outputModule: true,
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
        library: {
            type: 'module'
        },
        module: true,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
            },
        ],
    },
    resolve: {
        extensions: ['.js', '.ts', '.tsx'],
        fallback: {
            fs: false,
            module: false,
            net: false,
            assert: require.resolve('assert'),
            path: require.resolve('path-browserify'),
        },
    },
    externals: {
        'react': 'promise __NECODE_PLUGIN_EXTERNALS["react"]',
        '@mui/system': 'promise __NECODE_PLUGIN_EXTERNALS["@mui/system"]',
        '@necode-org/plugin-dev': 'promise __NECODE_PLUGIN_EXTERNALS["@necode-org/plugin-dev"]',
        '@necode-org/activity-dev': 'promise __NECODE_PLUGIN_EXTERNALS["@necode-org/activity-dev"]',
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser.js',
            Buffer: ['buffer', 'Buffer'],
        }),
    ]
};

module.exports = config;