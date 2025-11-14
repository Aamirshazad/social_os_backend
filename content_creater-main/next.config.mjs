/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // OPTIMIZATION: Use modern image formats for better compression
    formats: ['image/avif', 'image/webp'],
  },
  
  // OPTIMIZATION: Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'react-hot-toast'],
  },
  
  // OPTIMIZATION: Remove console logs in production and enable optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn logs
    } : false,
  },
  
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
};

export default nextConfig;
