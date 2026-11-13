ALTER TABLE "coupon_redemptions" ADD COLUMN "ip" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_logins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_ip" text;--> statement-breakpoint
CREATE INDEX "coupon_ip_idx" ON "coupon_redemptions" USING btree ("coupon_id","ip");