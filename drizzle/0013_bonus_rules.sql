CREATE TABLE "bonus_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"min_baht" integer NOT NULL,
	"pass_key" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "codes" ADD COLUMN "bonus" boolean DEFAULT false NOT NULL;