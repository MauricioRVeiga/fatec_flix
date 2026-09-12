import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Hostnames observados nos dados reais do upstream (logos e
    // imagens de EPG). Restritivo por hostname — nunca "https://**"
    // (PROJECT.md §48).
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
