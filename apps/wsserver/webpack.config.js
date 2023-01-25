const { spawn } = require('child_process');
const path = require('path');

const rel = x => './' + path.join(path.relative(process.cwd(), __dirname), x);

let child;

module.exports = {
    mode: 'development',
    target: 'node',
    devtool: 'inline-source-map',
    entry: './src/main.ts',
    output: {
        path: path.resolve(rel('dist')),
        filename: 'index.js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        alias: {
            ...Object.fromEntries(
                ['api', 'common', 'database', 'mike-config', 'backend']
                    .map(x => [x, `${x}/src`])
            ),
        },
    },
    module: {
        rules: [
            {
                loader: 'ts-loader',
                test: /\.tsx?$/,
                // Intentionally not excluding node_modules since our code is there.
                // exclude: /node_modules/,
                options: {
                    allowTsInNodeModules: true,
                }
            }
        ]
    },
    plugins: [
        {
            apply: compiler => {
                if (process.env.NODE_ENV !== 'production') {
                    compiler.hooks.afterEmit.tap('AfterEmitPlugin', () => {
                        if (child) {
                            child.kill();
                        }
                        child = spawn('node', [rel('dist/index.js')]);
                        child.stdout.on('data', function (data) {
                            process.stdout.write(data);
                        });
                        child.stderr.on('data', function (data) {
                            process.stderr.write(data);
                        });
                    });
                }
            }
        }
    ],
    externals: {
        bufferutil: "bufferutil",
        "utf-8-validate": "utf-8-validate",
        "socket.io": "commonjs socket.io",
        "_http_common": "commonjs2 _http_common",
        encoding: "commonjs2 encoding",
        "util/types": "commonjs2 util/types"
    },
    node: {
        __dirname: true,
    },
    experiments: {
        topLevelAwait: true
    }
};