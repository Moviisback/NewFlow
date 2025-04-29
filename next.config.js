// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Avoid canvas and encoding modules
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      encoding: false,
    };
    
    // Exclude native modules from bundling
    config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    
    return config;
  },
  // Using object for serverActions (not boolean)
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
  // Add transpilePackages
  transpilePackages: ['pdf-parse', 'pdfjs-dist'],
  // Customize which extensions Turbopack handles
  turbo: {
    rules: {
      // Add .mjs files to be processed by Turbopack
      '*.mjs': {
        loader: 'js',
      }
    }
  }
};

module.exports = nextConfig;