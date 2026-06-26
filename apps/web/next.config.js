/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@luckyray/shared',
    '@luckyray/astronomy',
    '@luckyray/jyotish',
    '@luckyray/ai',
    '@luckyray/storage',
  ],
  experimental: {
    // Enable for better performance in the monorepo
    optimizePackageImports: ['lucide-react'],
  },
};

module.exports = nextConfig;
