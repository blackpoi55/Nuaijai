CREATE TABLE "slips" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"image_data" text NOT NULL,
	"image_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"admin_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "slips" ADD CONSTRAINT "slips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "slips_user_idx" ON "slips" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "slips_status_idx" ON "slips" USING btree ("status");--> statement-breakpoint
CREATE INDEX "slips_hash_idx" ON "slips" USING btree ("image_hash");