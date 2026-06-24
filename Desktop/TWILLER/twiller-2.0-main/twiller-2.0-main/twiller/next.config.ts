import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  env: {
    BACKEND_URL: process.env.BACKEND_URL,
  },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
