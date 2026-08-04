import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@certindo/ui', '@certindo/types', '@certindo/validation'],
};

export default nextConfig;
