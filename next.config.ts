import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["@electric-sql/pglite"],
  poweredByHeader: false,
  images: { unoptimized: true },
};

export default nextConfig;
