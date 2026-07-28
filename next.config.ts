import type { NextConfig } from "next";
import { imageLocalPatterns, imageRemotePatterns } from "./src/config/imagePatterns";

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 92],
    localPatterns: imageLocalPatterns,
    remotePatterns: imageRemotePatterns,
  },
};

export default nextConfig;
