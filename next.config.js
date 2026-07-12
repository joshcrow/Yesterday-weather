/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Type-checking still runs and will fail the build on type errors;
    // we only skip ESLint here so deploys don't require an ESLint config.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
