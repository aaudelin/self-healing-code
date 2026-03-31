/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@aiops/shared'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
