CREATE TYPE "public"."project_photo_category" AS ENUM('progress', 'completion', 'inspection', 'incident', 'asset', 'other');--> statement-breakpoint
CREATE TABLE "project_photo_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"photo_id" integer NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"milestone_id" integer,
	"uploaded_by" integer NOT NULL,
	"file_url" text NOT NULL,
	"file_key" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"accuracy" numeric(10, 2),
	"category" "project_photo_category" DEFAULT 'other',
	"note" text,
	"captured_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_photo_tags" ADD CONSTRAINT "project_photo_tags_photo_id_project_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."project_photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_photos" ADD CONSTRAINT "project_photos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_photos" ADD CONSTRAINT "project_photos_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_photos" ADD CONSTRAINT "project_photos_uploaded_by_employees_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_photo_tags_photo_idx" ON "project_photo_tags" USING btree ("photo_id");--> statement-breakpoint
CREATE INDEX "project_photo_tags_tag_idx" ON "project_photo_tags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "project_photos_project_idx" ON "project_photos" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_photos_milestone_idx" ON "project_photos" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "project_photos_uploaded_by_idx" ON "project_photos" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "project_photos_category_idx" ON "project_photos" USING btree ("category");--> statement-breakpoint
CREATE INDEX "project_photos_captured_at_idx" ON "project_photos" USING btree ("captured_at");