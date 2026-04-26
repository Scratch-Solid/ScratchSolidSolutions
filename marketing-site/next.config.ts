/** @type {import('next').NextConfig} */
import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'marketing-site-ai3.pages.dev',
      }
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24,
  },
    compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
