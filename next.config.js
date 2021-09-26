/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  webpack(config, ctx) {
    if (!ctx.isServer) {
      // Support @babel/core
      // https://stackoverflow.com/a/34033159/4937286
      config.resolve ??= {};
      config.resolve.fallback ??= {};
      config.resolve.fallback.fs = false;
      config.resolve.fallback.module = false;
      config.resolve.fallback.net = false;
    }
    return config;
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/dev/:path*',
          destination: process.env.Node_ENV === 'development' ? '/dev/:path*' : '/404'
        }
      ]
    };
  }
}
