/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep existing configurations (if any)...
  experimental: {
    // Add this line to properly handle pdf-parse on the server
    serverComponentsExternalPackages: ['pdf-parse'],
  },
};

module.exports = nextConfig;