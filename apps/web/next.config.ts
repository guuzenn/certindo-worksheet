import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@certindo/ui', '@certindo/types', '@certindo/validation'],
  output: 'standalone',
};

export default nextConfig;
