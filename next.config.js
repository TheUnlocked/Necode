const withTM = require('next-transpile-modules')([/* Problematic module names go here */]);

/** @type {import('next').NextConfig} */
module.exports = withTM({
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    outputFileTracingIgnores: ['**esbuild-linux-64**', '**@mui**'],
  },
  webpack(config, ctx) {
    return Object.assign({}, config, {
      // Support @babel/core
      // https://stackoverflow.com/a/34033159/4937286
      resolve: Object.assign({}, config.resolve, {
        alias: {
          ...config.resolve.alias,
          // @monaco-editor/react loads monaco dynamically, but y-monaco does not.
          // Loading from node_modules causes issues with Next.js, so we have to avoid it.
          'monaco-editor': require.resolve('./src/util/monaco-loader.ts'),
        },
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
});

// module.exports = require('@next/bundle-analyzer')({ enabled: true })(module.exports);