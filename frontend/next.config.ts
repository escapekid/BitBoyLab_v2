import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // Proxy to the Python FastAPI backend
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
