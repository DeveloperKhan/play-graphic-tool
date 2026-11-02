import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The in-browser recognizer's files live in a content-hashed folder, so they never change.
  async headers() {
    return [
      {
        source: "/team-recognizer/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imagedelivery.net",
        pathname: "/2qzpDFW7Yl3NqBaOSqtWxQ/**",
      },
    ],
  },
};

export default nextConfig;
