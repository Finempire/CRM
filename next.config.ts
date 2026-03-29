import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "52mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Linode Object Storage — virtual-hosted: <bucket>.<region>.linodeobjects.com
      { protocol: "https", hostname: "*.linodeobjects.com" },
    ],
  },
};

export default nextConfig;
