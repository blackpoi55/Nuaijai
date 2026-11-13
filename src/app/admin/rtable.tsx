"use client";

import { useEffect, useRef } from "react";

// บนมือถือ ตารางจะกลายเป็นการ์ดทีละแถว: ใส่ชื่อคอลัมน์ (data-label) ให้ทุกช่องจากหัวตาราง (CSS ใน globals.css: .rtable)
export function RTable({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const label = () => {
      const heads = [...el.querySelectorAll("thead th")].map((th) => th.textContent?.trim() ?? "");
      el.querySelectorAll("tbody tr").forEach((tr) => {
        [...tr.children].forEach((td, i) => {
          const l = heads[i] ?? "";
          if (td.getAttribute("data-label") !== l) td.setAttribute("data-label", l);
        });
      });
    };
    label();
    const mo = new MutationObserver(label);
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return (
    <div ref={ref} className="rtable glass scrollbar-thin overflow-x-auto rounded-2xl">
      {children}
    </div>
  );
}
