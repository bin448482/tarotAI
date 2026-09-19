/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // Keep the admin application separate from the public portal served at `/`.
  // `basePath` is applied at build time, including to Next.js assets and links.
  basePath: '/admin',
  transpilePackages: ['antd'],
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8001',
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  }
};

module.exports = nextConfig;
