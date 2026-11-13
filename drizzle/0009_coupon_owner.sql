ALTER TABLE "coupons" ADD COLUMN "owner_id" integer;--> statement-breakpoint
-- ย้อนผูกคูปองที่ได้จากวงล้อก่อนหน้านี้ ให้เป็นของคนที่หมุนได้
UPDATE "coupons" SET "owner_id" = s."user_id" FROM "wheel_spins" s WHERE s."reward" = "coupons"."code" AND "coupons"."owner_id" IS NULL;
