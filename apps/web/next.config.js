/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@aiops/shared'],
  experimental: {
    serverComponentsExternalPackages: ['@aiops/shared'],
  },
};

module.exports = nextConfig;
