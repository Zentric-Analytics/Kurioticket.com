import type { NextConfig } from "next";
import { imageLocalPatterns, imageRemotePatterns } from "./src/config/imagePatterns";

const nextConfig: NextConfig = {
  experimental: {
    // Shared build hosts expose more CPUs than their memory allocation supports.
    // Bound page-generation concurrency instead of spawning one worker per CPU.
    cpus: 2,
  },
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
    // Keep curated asset versions aligned with the shared image-source helper.
    localPatterns: imageLocalPatterns,
    remotePatterns: imageRemotePatterns,
  },
};

export default nextConfig;
