const fs = require('fs');
const path = require('path');
const localPackages = fs.readdirSync(path.resolve(__dirname, '../../packages')).map(x =>
    JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../packages', x, 'package.json'), { encoding: 'utf-8' })).name);
console.log('Local packages:', localPackages.join(', '));

/** @type {<T>(x: {}, original: T, updates: Partial<T>) => T} */
const assign = Object.assign;

/** @type {import('next').NextConfig} */
module.exports = {
    reactStrictMode: true,
    swcMinify: true,
    experimental: {
        // Omits certain modules to significantly speed up lambda cold start.
        // Note that excluding @mui means `getServerSideProps`/`getInitialProps` WILL NOT WORK.
        // `getStaticProps` is still fine to use, since it happens during build time.
        outputFileTracingIgnores: ['**esbuild-linux-64**', '**@mui**'],
        esmExternals: 'loose',
    },
    transpilePackages: [...localPackages],
    modularizeImports: {
        lodash: {
            transform: 'lodash/{{member}}',
            preventFullImport: true,
        },
        'lodash/fp': {
            transform: 'lodash/fp/{{member}}',
            preventFullImport: true,
        },
        '@material/icons-material': {
            transform: '@material/icons-material/{{member}}',
            preventFullImport: true,
        },
        '@material/material': {
            transform: '@material/material/{{member}}',
            preventFullImport: true,
        },
    },
    /**
     * 
     * @param {import('webpack').Configuration} config 
     * @param {import('next/dist/server/config-shared').WebpackConfigContext} ctx 
     * @returns {import('webpack').Configuration}
     */
    webpack(config, ctx) {
        return assign({}, config, {
            // Support @babel/core
            // https://stackoverflow.com/a/34033159/4937286
            resolve: assign({}, config.resolve, {
                fallback: assign({}, config.resolve.fallback, {
                    fs: false,
                    module: false,
                    net: false,
                    // socket.io-client causes some issues during SSR, so these are just here to satisfy it.
                    bufferutil: false,
                    "utf-8-validate": false,
                }),
            }),
            plugins: [
                ...config.plugins ?? [],
            ],
        });
    },
    async headers() {
        return [
            {
                source: '/:any*',
                headers: [
                    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
                    { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
                ]
            }
        ];
    },
};

// module.exports = require('@next/bundle-analyzer')({ enabled: true })(module.exports);