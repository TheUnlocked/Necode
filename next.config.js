const withTM = require('next-transpile-modules')([/* Problematic module names go here */]);
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

/** @type {import('next').NextConfig} */
module.exports = withTM({
  reactStrictMode: true,
  webpack(config, ctx) {
    return Object.assign({}, config, {
      // Support @babel/core
      // https://stackoverflow.com/a/34033159/4937286
      resolve: Object.assign({}, config.resolve, {
        fallback: Object.assign({}, config.resolve.fallback, {
          fs: false,
          module: false,
          net: false,
        })
      }),
      plugins: [
        ...config.plugins ?? [],
        // new BundleAnalyzerPlugin()
      ]
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
  }
});
