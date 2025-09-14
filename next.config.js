const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development mode
});

module.exports = withPWA({
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins = config.plugins.filter(
        (plugin) => plugin.constructor.name !== 'GenerateSW'
      );
    }
    return config;
  },
});