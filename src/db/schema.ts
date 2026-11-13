import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// เงินและแต้มเก็บเป็น "สตางค์" (จำนวนเต็ม) เสมอ เพราะซองอั่งเปามีเศษสตางค์ได้ — 1 แต้ม = 1 บาท = 100 สตางค์

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // เก็บเป็นตัวพิมพ์เล็ก
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  points: integer("points").notNull().default(0), // สตางค์
  banned: boolean("banned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 ของ token ในคุกกี้
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export type Perk = { t: string; d: string };

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  passKey: text("pass_key").notNull().unique(), // id ในเกม: พาส "vip" / กล่อง "box_bubble" / แพ็กกาชา "gacha_x10"
  // pass = มีได้ชิ้นเดียวต่อคน (ซื้อซ้ำในโค้ดรวมไม่ได้) • item = กล่อง บัตร ตั๋ว ซื้อซ้ำได้
  kind: text("kind", { enum: ["pass", "item"] }).notNull().default("pass"),
  robloxProductId: bigint("roblox_product_id", { mode: "number" }).notNull(),
  name: text("name").notNull(),
  blurb: text("blurb").notNull().default(""),
  perks: jsonb("perks").$type<Perk[]>().notNull().default(sql`'[]'::jsonb`),
  color: text("color").notNull().default("#7C5CFF"),
  iconAssetId: bigint("icon_asset_id", { mode: "number" }),
  priceRobux: integer("price_robux").notNull(), // ราคาเต็ม (ไม่ใช่ราคาลด Premium)
  active: boolean("active").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(100),
  saleEnd: timestamp("sale_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const topups = pgTable(
  "topups",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    voucherHash: text("voucher_hash").notNull().unique(), // กันซองเดียวเติมซ้ำ
    amount: integer("amount").notNull().default(0), // สตางค์ที่ได้รับจริง
    status: text("status", { enum: ["pending", "success", "failed"] }).notNull().default("pending"),
    providerCode: text("provider_code"),
    message: text("message"),
    senderName: text("sender_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("topups_user_idx").on(t.userId), index("topups_created_idx").on(t.createdAt)],
);

export type OrderItem = {
  productId: number;
  passKey: string;
  kind?: "pass" | "item";
  name: string;
  priceRobux: number;
  qty: number;
};

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    items: jsonb("items").$type<OrderItem[]>().notNull(),
    totalRobux: integer("total_robux").notNull(),
    totalBaht: integer("total_baht").notNull(),
    robuxPerBaht: integer("robux_per_baht").notNull(),
    mode: text("mode", { enum: ["single", "split"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("orders_user_idx").on(t.userId), index("orders_created_idx").on(t.createdAt)],
);

export const codes = pgTable(
  "codes",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(), // 12 ตัว ไม่มีขีด (แสดงผลเป็น XXXX-XXXX-XXXX)
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    passKeys: jsonb("pass_keys").$type<string[]>().notNull(),
    label: text("label").notNull(),
    status: text("status", { enum: ["active", "used", "revoked"] }).notNull().default("active"),
    usedByRobloxId: bigint("used_by_roblox_id", { mode: "number" }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("codes_user_idx").on(t.userId), index("codes_order_idx").on(t.orderId)],
);

// เติมผ่านพร้อมเพย์: ผู้ใช้แนบสลิป แอดมินตรวจแล้วกดอนุมัติ
export const slips = pgTable(
  "slips",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    amount: integer("amount").notNull(), // สตางค์ ที่ผู้ใช้แจ้ง (แอดมินแก้ได้ตอนอนุมัติ)
    imageData: text("image_data").notNull(), // data:image/jpeg;base64,... (ย่อจากฝั่งเบราว์เซอร์แล้ว)
    imageHash: text("image_hash").notNull(), // sha256 ใช้จับสลิปซ้ำ
    status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
    note: text("note"), // เหตุผลที่ปฏิเสธ
    adminId: integer("admin_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [index("slips_user_idx").on(t.userId), index("slips_status_idx").on(t.status), index("slips_hash_idx").on(t.imageHash)],
);

// ทุกการเปลี่ยนแต้ม (เติม ซื้อ แอดมินปรับ คืนเงิน) — ใช้ตรวจย้อนหลัง
export const pointLedger = pgTable(
  "point_ledger",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    delta: integer("delta").notNull(), // สตางค์ (+/-)
    balanceAfter: integer("balance_after").notNull(),
    kind: text("kind", { enum: ["topup", "purchase", "admin", "refund"] }).notNull(),
    note: text("note"),
    refId: integer("ref_id"),
    adminId: integer("admin_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ledger_user_idx").on(t.userId)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Code = typeof codes.$inferSelect;
export type Topup = typeof topups.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Slip = typeof slips.$inferSelect;
