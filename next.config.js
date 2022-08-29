/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
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
};
