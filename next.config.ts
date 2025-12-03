import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression and optimization
  compress: true,

  // Production optimizations
  productionBrowserSourceMaps: false,

  // Modern JavaScript output - remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Content Security Policy
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const isPreview = process.env.VERCEL_ENV === 'preview';

    // Vercel Live feedback is available in preview environments
    const allowVercelLive = isDev || isPreview;

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js requires 'unsafe-eval' for development HMR, 'unsafe-inline' and 'wasm-unsafe-eval' for production
              // Vercel Live needs vercel.live for preview environments
              isDev
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
                : `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${allowVercelLive ? ' https://vercel.live' : ''}`,
              // Tailwind CSS requires 'unsafe-inline' for styles
              `style-src 'self' 'unsafe-inline'${allowVercelLive ? ' https://vercel.live' : ''}`,
              `img-src 'self' data: blob:${allowVercelLive ? ' https://vercel.live https://vercel.com' : ''}`,
              `font-src 'self' data:${allowVercelLive ? ' https://vercel.live https://assets.vercel.com' : ''}`,
              `connect-src 'self'${isDev ? ' ws: wss:' : ''}${allowVercelLive ? ' https://vercel.live wss://ws-us3.pusher.com' : ''}`,
              // Allow workers from blob URLs (needed for canvas-confetti and Next.js)
              "worker-src 'self' blob:",
              // Vercel Live needs to embed feedback iframe
              allowVercelLive ? "frame-src https://vercel.live" : "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
    // Inline critical CSS to reduce render-blocking requests
    optimizeCss: true,
  },

  // Ensure modern JavaScript output (ES2022) - no legacy polyfills
  transpilePackages: [],
};

export default nextConfig;
