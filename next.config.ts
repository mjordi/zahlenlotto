import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance Optimierungen
  compress: true,

  // Produktions-Optimierungen
  reactStrictMode: true,

  // Power by header entfernen für Sicherheit
  poweredByHeader: false,

  // Vercel Analytics
  experimental: {
    optimizePackageImports: ['@/components'],
  },
};

export default nextConfig;
