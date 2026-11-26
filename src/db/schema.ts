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
  uniqueIndex,
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
  // กันเดารหัส: ผิดติดกันกี่ครั้ง / ล็อกถึงเมื่อไร (เก็บในฐานข้อมูล ใช้ได้ทุกเซิร์ฟเวอร์)
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  signupIp: text("signup_ip"), // sha256 ของ IP (ไม่เก็บ IP จริง)
  // วงล้อ: สิทธิ์หมุนที่เหลือ และยอดซื้อสะสม (บาท) ที่ยังไม่ครบ 1 สิทธิ์
  spinCredits: integer("spin_credits").notNull().default(0),
  spinProgress: integer("spin_progress").notNull().default(0),
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
  saleStart: timestamp("sale_start", { withTimezone: true }), // ยังไม่ถึงเวลา = โชว์ "เร็วๆ นี้" แต่ยังซื้อไม่ได้
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
    // true = รายการของแอดมิน (ทดสอบ) ไม่นับเป็นรายได้ ดูแยกที่ /admin/tests
    isTest: boolean("is_test").notNull().default(false),
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
    totalBaht: integer("total_baht").notNull(), // บาทที่จ่ายจริง (หลังหักส่วนลด)
    subtotalBaht: integer("subtotal_baht"), // ก่อนหักส่วนลด
    discountBaht: integer("discount_baht").notNull().default(0),
    couponId: integer("coupon_id"),
    robuxPerBaht: integer("robux_per_baht").notNull(),
    mode: text("mode", { enum: ["single", "split"] }).notNull(),
    // shop = ซื้อจริง • wheel = รางวัลจากวงล้อ (ไม่นับยอดขาย)
    source: text("source", { enum: ["shop", "wheel"] }).notNull().default("shop"),
    // true = รายการของแอดมิน (ทดสอบ) ไม่นับเป็นรายได้ ดูแยกที่ /admin/tests
    isTest: boolean("is_test").notNull().default(false),
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
    usedByName: text("used_by_name"), // Roblox username (@ชื่อ)
    usedByDisplayName: text("used_by_display_name"), // ชื่อที่แสดงในเกม
    usedAt: timestamp("used_at", { withTimezone: true }),
    // true = รายการของแอดมิน (ทดสอบ) ไม่นับเป็นรายได้ ดูแยกที่ /admin/tests
    isTest: boolean("is_test").notNull().default(false),
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
    // ตรวจสลิปอัตโนมัติ (SlipOK): เลขอ้างอิงรายการโอน (กันสลิปซ้ำแม้รูปต่างกัน) + ผลตรวจให้แอดมินดู
    transRef: text("trans_ref"),
    checkNote: text("check_note"),
    auto: boolean("auto").notNull().default(false), // true = ระบบอนุมัติเอง
    // true = รายการของแอดมิน (ทดสอบ) ไม่นับเป็นรายได้ ดูแยกที่ /admin/tests
    isTest: boolean("is_test").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [index("slips_user_idx").on(t.userId), index("slips_status_idx").on(t.status), index("slips_hash_idx").on(t.imageHash), uniqueIndex("slips_trans_ref_idx").on(t.transRef)],
);

// แจ้งเตือนในเว็บ (กระดิ่ง) — ส่ง Web Push ไปด้วยถ้าเครื่องนั้นเปิดรับไว้
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    url: text("url").notNull().default("/"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.id)],
);

// เครื่องที่เปิดรับ Web Push (หนึ่งคนมีได้หลายเครื่อง)
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("push_user_idx").on(t.userId)],
);

// คูปองที่แอดมินแจก: points = ได้แต้มฟรี (กรอกหน้าเติมแต้ม) • discount = ส่วนลดตอนซื้อ (กรอกในตะกร้า)
export const coupons = pgTable(
  "coupons",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(), // ตัวพิมพ์ใหญ่ ไม่มีช่องว่าง
    kind: text("kind", { enum: ["points", "discount"] }).notNull(),
    points: integer("points").notNull().default(0), // สตางค์ (แบบ points)
    discountType: text("discount_type", { enum: ["percent", "baht"] }), // แบบ discount
    discountValue: integer("discount_value").notNull().default(0), // % หรือ บาท
    minBaht: integer("min_baht").notNull().default(0), // ยอดขั้นต่ำ (แบบ discount)
    maxUses: integer("max_uses").notNull().default(1), // ใช้ได้กี่ครั้งรวม (คนละครั้ง)
    usedCount: integer("used_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    batch: text("batch").notNull(), // ชุดที่สร้างพร้อมกัน
    ownerId: integer("owner_id"), // คูปองส่วนตัว (เช่น ได้จากวงล้อ) — ว่าง = คูปองแจกทั่วไป
    note: text("note").notNull().default(""),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("coupons_batch_idx").on(t.batch)],
);

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: serial("id").primaryKey(),
    couponId: integer("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    orderId: integer("order_id"),
    amount: integer("amount").notNull(), // แต้มที่ได้ (สตางค์) หรือ ส่วนลด (บาท)
    ip: text("ip"), // sha256 ของ IP: คูปองเดียวกันใช้ซ้ำจาก IP เดิมไม่ได้
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("coupon_user_uq").on(t.couponId, t.userId), index("coupon_ip_idx").on(t.couponId, t.ip)], // คนละครั้ง
);

// วงล้อเสี่ยงโชค (ได้สิทธิ์หมุนจากการซื้อเท่านั้น ไม่มีการจ่ายเพื่อหมุน)
// kind: points = แต้ม (value = สตางค์) • coupon = คูปองส่วนลดส่วนตัว (value = %/บาท ตาม couponType) • item = โค้ดของในเกม (passKey) • none = เกือบได้
export const wheelPrizes = pgTable("wheel_prizes", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  kind: text("kind", { enum: ["points", "coupon", "item", "none"] }).notNull(),
  value: integer("value").notNull().default(0),
  couponType: text("coupon_type", { enum: ["percent", "baht"] }),
  passKey: text("pass_key"),
  weight: integer("weight").notNull().default(1), // โอกาสออก (สัดส่วน)
  stock: integer("stock"), // จำนวนที่เหลือ (ว่าง = ไม่จำกัด)
  color: text("color").notNull().default("#e2c27d"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const wheelSpins = pgTable(
  "wheel_spins",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    prizeId: integer("prize_id"),
    label: text("label").notNull(),
    kind: text("kind").notNull(),
    reward: text("reward"), // โค้ดคูปอง / โค้ดเกม ที่ได้
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("wheel_spins_user_idx").on(t.userId)],
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
    kind: text("kind", { enum: ["topup", "purchase", "admin", "refund", "coupon", "wheel"] }).notNull(),
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

// โค้ดแจกของในเกม (แอดมินสร้าง ไม่ผูกกับคำสั่งซื้อ) — กรอกในแอป "โค้ด" ในเกม
// ใช้ได้กี่คนก็ได้ตาม maxUses (คนละครั้งต่อ Roblox ID) • จำกัดเลเวล / ช่วงเวลาได้
export const giftCodes = pgTable(
  "gift_codes",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(), // ตัวพิมพ์ใหญ่ ไม่มีขีด
    passKeys: jsonb("pass_keys").$type<string[]>().notNull(), // ซ้ำได้ = หลายชิ้น
    label: text("label").notNull(),
    minLevel: integer("min_level").notNull().default(0),
    maxUses: integer("max_uses").notNull().default(1),
    usedCount: integer("used_count").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    batch: text("batch").notNull(),
    note: text("note").notNull().default(""),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gift_codes_batch_idx").on(t.batch)],
);

export const giftRedemptions = pgTable(
  "gift_redemptions",
  {
    id: serial("id").primaryKey(),
    giftId: integer("gift_id")
      .notNull()
      .references(() => giftCodes.id, { onDelete: "cascade" }),
    robloxId: bigint("roblox_id", { mode: "number" }).notNull(),
    name: text("name"),
    displayName: text("display_name"),
    level: integer("level"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("gift_user_uq").on(t.giftId, t.robloxId)], // คนละครั้ง
);

export type User = typeof users.$inferSelect;
export type GiftCode = typeof giftCodes.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Code = typeof codes.$inferSelect;
export type Topup = typeof topups.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Slip = typeof slips.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type WheelPrize = typeof wheelPrizes.$inferSelect;
