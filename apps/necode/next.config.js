/** @type {import('next').NextConfig} */
module.exports = {
    reactStrictMode: true,
    swcMinify: true,
    experimental: {
        // Omits certain modules to significantly speed up lambda cold start.
        // Note that excluding @mui means `getServerSideProps`/`getInitialProps` WILL NOT WORK.
        // `getStaticProps` is still fine to use, since it happens during build time.
        outputFileTracingIgnores: ['**esbuild-linux-64**', '**@mui**'],
    },
    transpilePackages: ["~common", "~api", "~backend", "~database", "~utils", "~shared"],
    modularizeImports: {
        lodash: {
            transform: 'lodash/{{member}}',
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
    webpack(config, ctx) {
        return Object.assign({}, config, {
            // Support @babel/core
            // https://stackoverflow.com/a/34033159/4937286
            resolve: Object.assign({}, config.resolve, {
                fallback: Object.assign({}, config.resolve.fallback, {
                    fs: false,
                    module: false,
                    net: false,
                }),
            }),
            plugins: [
                ...config.plugins ?? [],
            ],
        });
    },
};

// module.exports = require('@next/bundle-analyzer')({ enabled: true })(module.exports);