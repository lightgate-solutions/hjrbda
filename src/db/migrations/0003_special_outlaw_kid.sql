ALTER TABLE "projects" ADD COLUMN "street" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "city" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "state" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "location";