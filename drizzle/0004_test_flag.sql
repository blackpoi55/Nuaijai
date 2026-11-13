ALTER TABLE "codes" ADD COLUMN "is_test" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "is_test" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "slips" ADD COLUMN "is_test" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "topups" ADD COLUMN "is_test" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- ย้อนหลัง: รายการที่ผู้ใช้เป็นแอดมินอยู่ตอนนี้ ถือเป็นการเทส
UPDATE "topups" SET "is_test" = true WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "role" = 'admin');--> statement-breakpoint
UPDATE "orders" SET "is_test" = true WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "role" = 'admin');--> statement-breakpoint
UPDATE "codes" SET "is_test" = true WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "role" = 'admin');--> statement-breakpoint
UPDATE "slips" SET "is_test" = true WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "role" = 'admin');
