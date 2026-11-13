import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "เหนื่อยใจ Pass Shop",
    short_name: "เหนื่อยใจ",
    description: "ซื้อพาสและไอเทมแมพเหนื่อยใจ เติมแต้ม รับโค้ดทันที",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0908",
    theme_color: "#0a0908",
    lang: "th",
    categories: ["games", "shopping"],
    icons: [
      { src: "/icons/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "เติมแต้ม", url: "/topup", icons: [{ src: "/icons/192.png", sizes: "192x192" }] },
      { name: "โค้ดของฉัน", url: "/orders", icons: [{ src: "/icons/192.png", sizes: "192x192" }] },
    ],
  };
}
