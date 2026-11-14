ALTER TABLE "slips" ADD COLUMN "trans_ref" text;--> statement-breakpoint
ALTER TABLE "slips" ADD COLUMN "check_note" text;--> statement-breakpoint
ALTER TABLE "slips" ADD COLUMN "auto" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "slips_trans_ref_idx" ON "slips" USING btree ("trans_ref");