import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.reidoscanais.st",
      },
      {
        protocol: "https",
        hostname: "api.reidoscanais.st",
      },
    ],
  },
};

export default nextConfig;
