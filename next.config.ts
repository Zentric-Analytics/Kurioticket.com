import type { NextConfig } from "next";
import { imageLocalPatterns, imageRemotePatterns } from "./src/config/imagePatterns";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/deals/:path*",
        destination: "/packages/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    qualities: [75, 92, 100],
    localPatterns: imageLocalPatterns,
    remotePatterns: imageRemotePatterns,
  },
};

export default nextConfig;
