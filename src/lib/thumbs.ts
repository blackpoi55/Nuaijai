import "server-only";

// รูปไอคอนสินค้าจาก Roblox: ขอทีเดียวหลายรูป (ทีละไม่เกิน 100) แล้วจำไว้
// (เดิมขอทีละรูป ~30 ครั้งพร้อมกัน → Roblox จำกัดความถี่ บางรูปเลยไม่ขึ้น)

const mem = new Map<number, { url: string; at: number }>();
const TTL = 6 * 3600_000;

async function fetchBatch(ids: number[]): Promise<Record<number, string>> {
  const out: Record<number, string> = {};
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(
        `https://thumbnails.roblox.com/v1/assets?assetIds=${ids.join(",")}&returnPolicy=PlaceHolder&size=420x420&format=Png&isCircular=false`,
        { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) },
      );
      if (r.status === 429) {
        await new Promise((res) => setTimeout(res, 600 * (attempt + 1)));
        continue;
      }
      if (!r.ok) break;
      const j = (await r.json()) as { data?: { targetId: number; state: string; imageUrl?: string }[] };
      for (const d of j.data ?? []) if (d.imageUrl && d.state === "Completed") out[d.targetId] = d.imageUrl;
      break;
    } catch {
      await new Promise((res) => setTimeout(res, 400));
    }
  }
  return out;
}

/** asset id → URL รูปบน CDN ของ Roblox (รูปที่ยังหาไม่ได้จะไม่มีใน map) */
export async function getThumbs(assetIds: (number | null | undefined)[]): Promise<Map<number, string>> {
  const now = Date.now();
  const want = [...new Set(assetIds.filter((x): x is number => !!x))];
  const missing = want.filter((id) => !(mem.get(id) && now - mem.get(id)!.at < TTL));
  for (let i = 0; i < missing.length; i += 100) {
    const got = await fetchBatch(missing.slice(i, i + 100));
    for (const [id, url] of Object.entries(got)) mem.set(Number(id), { url, at: now });
  }
  const res = new Map<number, string>();
  for (const id of want) {
    const m = mem.get(id);
    if (m) res.set(id, m.url);
  }
  return res;
}

export async function getThumb(assetId: number): Promise<string | null> {
  return (await getThumbs([assetId])).get(assetId) ?? null;
}
