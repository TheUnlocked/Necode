const { spawn } = require('child_process');
const path = require('path');

const rel = x => './' + path.join(path.relative(process.cwd(), __dirname), x);

let child;

module.exports = {
    mode: 'development',
    target: 'node',
    devtool: 'inline-source-map',
    entry: rel('src/main.ts'),
    output: {
        path: path.resolve(rel('dist')),
        filename: 'index.js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            {
                loader: 'ts-loader',
                test: /\.tsx?$/,
                exclude: /node_modules/,
                options: {
                    context: path.resolve('./websocketServer'),
                    onlyCompileBundledFiles: true,
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
    },
    experiments: {
        topLevelAwait: true
    }
};