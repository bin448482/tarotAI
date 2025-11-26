/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['antd'],
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8001',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  }
};

module.exports = nextConfig;
