"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, ExternalLink, ImagePlus, Loader2, MessageCircle, Send, XCircle } from "lucide-react";
import { submitSlipAction } from "@/app/actions/shop";
import { maskPhone, promptPayPayload } from "@/lib/promptpay";

const QUICK = [50, 100, 200, 300, 500, 1000];

// ย่อรูปสลิปในเบราว์เซอร์ก่อนส่ง (ด้านยาวสุด 1400px, JPEG)
async function compress(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ContactAdmin({ url, strong }: { url: string; strong?: boolean }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition hover:brightness-110 ${strong ? "border-[#5865F2]/50 bg-[#5865F2]/20" : "border-[#5865F2]/25 bg-[#5865F2]/10"}`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#5865F2] text-white">
        <MessageCircle className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">ตรวจเร็วขึ้น — ทักแอดมิน Discord</span>
        <span className="block text-xs text-muted">ส่งชื่อผู้ใช้กับสลิป</span>
      </span>
      <ExternalLink className="size-4 shrink-0 text-muted" />
    </a>
  );
}

export function PromptPayForm({ promptpayId, contactUrl }: { promptpayId: string; contactUrl: string }) {
  const [state, action, pending] = useActionState(submitSlipAction, undefined);
  const [amount, setAmount] = useState("100");
  const [qr, setQr] = useState("");
  const [image, setImage] = useState("");
  const [imgErr, setImgErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const baht = Number(amount);
  const validAmount = Number.isFinite(baht) && baht >= 1 && baht <= 50000;

  useEffect(() => {
    if (!validAmount || !promptpayId) return setQr("");
    const t = setTimeout(() => {
      QRCode.toDataURL(promptPayPayload(promptpayId, Math.round(baht * 100) / 100), { margin: 1, width: 360, errorCorrectionLevel: "M" })
        .then(setQr)
        .catch(() => setQr(""));
    }, 200);
    return () => clearTimeout(t);
  }, [baht, validAmount, promptpayId]);

  useEffect(() => {
    if (state?.ok) {
      setImage("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-5">
      {/* 1. ยอด */}
      <div>
        <p className="mb-2 text-sm font-semibold">
          <span className="text-dim">1.</span> ใส่ยอดที่จะโอน (บาท)
        </p>
        <input
          name="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          className="input !py-3.5 text-center text-2xl font-extrabold"
        />
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(String(q))}
              className={`rounded-xl py-1.5 text-xs font-bold transition ${Number(amount) === q ? "bg-sky-400 text-ink" : "bg-white/5 text-muted hover:bg-white/10"}`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 2. QR */}
      <div>
        <p className="mb-2 text-sm font-semibold">
          <span className="text-dim">2.</span> สแกนจ่ายด้วยแอปธนาคาร
        </p>
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-4 text-ink sm:flex-row sm:items-center">
          <div className="grid size-44 shrink-0 place-items-center rounded-2xl bg-white">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR พร้อมเพย์" className="size-44" />
            ) : (
              <span className="text-sm text-slate-400">ใส่ยอดก่อน</span>
            )}
          </div>
          <div className="text-center sm:text-left">
            <p className="inline-block rounded-lg bg-[#1d3a6e] px-2.5 py-1 text-xs font-bold tracking-wider text-white">PromptPay</p>
            <p className="mt-2 text-xs text-slate-500">พร้อมเพย์</p>
            <p className="font-mono text-lg font-bold">{maskPhone(promptpayId)}</p>
            <p className="mt-1 text-xs text-slate-500">ยอดที่ต้องโอน</p>
            <p className="text-3xl font-black">฿{validAmount ? baht.toLocaleString("th-TH", { maximumFractionDigits: 2 }) : "-"}</p>
          </div>
        </div>
      </div>

      {/* 3. สลิป */}
      <div>
        <p className="mb-2 text-sm font-semibold">
          <span className="text-dim">3.</span> แนบสลิปการโอน
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            setImgErr("");
            const f = e.target.files?.[0];
            if (!f) return;
            if (!f.type.startsWith("image/")) return setImgErr("ต้องเป็นไฟล์รูปภาพ");
            if (f.size > 15 * 1024 * 1024) return setImgErr("ไฟล์ใหญ่เกิน 15MB");
            try {
              setImage(await compress(f));
            } catch {
              setImgErr("อ่านรูปไม่ได้ ลองแคปหน้าจอสลิปใหม่");
            }
          }}
        />
        <input type="hidden" name="image" value={image} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-white/15 p-4 text-left transition hover:border-sky-400/60 hover:bg-white/5"
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="สลิป" className="h-24 w-16 rounded-lg object-cover" />
          ) : (
            <span className="grid h-24 w-16 place-items-center rounded-lg bg-white/5">
              <ImagePlus className="size-6 text-dim" />
            </span>
          )}
          <span>
            <span className="block font-semibold">{image ? "เปลี่ยนรูปสลิป" : "เลือกรูปสลิป"}</span>
            <span className="block text-xs text-dim">แคปหน้าจอสลิปให้เห็นยอดชัดๆ</span>
          </span>
        </button>
        {imgErr && <p className="mt-1 text-sm text-danger">{imgErr}</p>}
      </div>

      <button
        disabled={pending || !image || !validAmount}
        className="btn btn-primary w-full !py-4 text-base"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        {pending ? "กำลังส่งสลิป..." : "ส่งสลิปให้แอดมินตรวจ"}
      </button>

      {state && (
        <div
          key={state.message}
          className={`animate-pop flex items-start gap-3 rounded-2xl border p-4 ${state.ok ? "border-leaf/30 bg-leaf/10" : "border-danger/30 bg-danger/10"}`}
        >
          {state.ok ? <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-leaf" /> : <XCircle className="mt-0.5 size-6 shrink-0 text-danger" />}
          <p className={`font-semibold ${state.ok ? "text-leaf" : "text-danger"}`}>{state.message}</p>
        </div>
      )}

      <ContactAdmin url={contactUrl} strong={state?.ok} />
    </form>
  );
}
