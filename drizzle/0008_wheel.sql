CREATE TABLE "wheel_prizes" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"coupon_type" text,
	"pass_key" text,
	"weight" integer DEFAULT 1 NOT NULL,
	"stock" integer,
	"color" text DEFAULT '#e2c27d' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wheel_spins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"prize_id" integer,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"reward" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "source" text DEFAULT 'shop' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "spin_credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "spin_progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wheel_spins" ADD CONSTRAINT "wheel_spins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wheel_spins_user_idx" ON "wheel_spins" USING btree ("user_id");