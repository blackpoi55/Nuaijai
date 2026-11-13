import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["@electric-sql/pglite"],
  poweredByHeader: false,
  images: { unoptimized: true },
  // สลิปพร้อมเพย์ส่งผ่าน server action (ย่อรูปในเบราว์เซอร์ก่อนแล้ว)
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};

export default nextConfig;
