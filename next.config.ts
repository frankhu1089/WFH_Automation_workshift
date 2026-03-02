import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // xlsx needs these to be ignored in browser build
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
