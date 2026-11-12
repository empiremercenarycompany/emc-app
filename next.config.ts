import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    return [{ source: "/calendar", destination: "/schedule", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/sirath",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/sirath/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/dm/sirath",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
