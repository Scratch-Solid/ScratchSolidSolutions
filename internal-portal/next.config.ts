/** @type {import('next').NextConfig} */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  // Type-checking and linting run as separate CI steps; the production
  // container build must not be blocked by test-tooling type config
  // (e.g. jest/@testing-library types referenced in tsconfig).
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['better-auth', '@better-auth/core', '@better-auth/infra', 'pg', 'ioredis', '@aws-sdk/client-s3'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
