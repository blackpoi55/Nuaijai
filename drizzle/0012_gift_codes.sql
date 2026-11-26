CREATE TABLE "gift_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"pass_keys" jsonb NOT NULL,
	"label" text NOT NULL,
	"min_level" integer DEFAULT 0 NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"batch" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "gift_redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"gift_id" integer NOT NULL,
	"roblox_id" bigint NOT NULL,
	"name" text,
	"display_name" text,
	"level" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gift_redemptions" ADD CONSTRAINT "gift_redemptions_gift_id_gift_codes_id_fk" FOREIGN KEY ("gift_id") REFERENCES "public"."gift_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gift_codes_batch_idx" ON "gift_codes" USING btree ("batch");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_user_uq" ON "gift_redemptions" USING btree ("gift_id","roblox_id");