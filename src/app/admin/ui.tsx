// ชิ้นส่วน UI ของหลังบ้าน (server-safe)
import { RTable } from "./rtable";
export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-fg">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-dim">{hint}</p>}
    </div>
  );
}

export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <RTable>
      <table className="w-full text-left text-sm sm:min-w-[640px]">
        <thead className="border-b border-line text-xs text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:whitespace-nowrap [&_td]:px-4 [&_td]:py-3 [&_tr]:border-b [&_tr]:border-line [&_tr:last-child]:border-0">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center text-muted">ไม่มีข้อมูล</p>}
    </RTable>
  );
}

export function Status({ s }: { s: string }) {
  const map: Record<string, [string, string]> = {
    success: ["สำเร็จ", "text-leaf border-leaf/30 bg-leaf/10"],
    failed: ["ล้มเหลว", "text-danger border-danger/30 bg-danger/10"],
    pending: ["กำลังตรวจ", "text-gold border-gold/30 bg-gold/10"],
    active: ["ยังไม่ใช้", "text-aqua border-aqua/30 bg-aqua/10"],
    used: ["ใช้แล้ว", "text-leaf border-leaf/30 bg-leaf/10"],
    revoked: ["ยกเลิก", "text-danger border-danger/30 bg-danger/10"],
  };
  const [label, cls] = map[s] ?? [s, ""];
  return <span className={`chip ${cls}`}>{label}</span>;
}

export const thaiDate = new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok" });

export function SearchBox({ placeholder, defaultValue }: { placeholder: string; defaultValue?: string }) {
  return (
    <form className="w-full max-w-xs">
      <input name="q" defaultValue={defaultValue} placeholder={placeholder} className="input !py-2.5 text-sm" />
    </form>
  );
}
