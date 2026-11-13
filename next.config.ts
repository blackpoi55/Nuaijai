import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["@electric-sql/pglite", "web-push"],
  poweredByHeader: false,
  images: { unoptimized: true },
  // สลิปพร้อมเพย์ส่งผ่าน server action (ย่อรูปในเบราว์เซอร์ก่อนแล้ว)
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  // กันเอาเว็บไปซ้อนในเว็บอื่น (clickjacking), กันเดาประเภทไฟล์, ไม่ส่ง URL เต็มไปเว็บอื่น
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default nextConfig;
