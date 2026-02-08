import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hjrbda-assets.cave.ng",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
