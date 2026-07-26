CREATE TABLE IF NOT EXISTS "resource_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_folder_id" uuid,
	"color" varchar(30) DEFAULT 'neutral' NOT NULL,
	"cover_resource_id" uuid,
	"display_order" integer DEFAULT 0 NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_folders" ADD CONSTRAINT "resource_folders_parent_folder_id_resource_folders_id_fk" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."resource_folders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_folders" ADD CONSTRAINT "resource_folders_cover_resource_id_resources_id_fk" FOREIGN KEY ("cover_resource_id") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_folders" ADD CONSTRAINT "resource_folders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_folders_tenant_id_idx" ON "resource_folders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_folders_parent_folder_id_idx" ON "resource_folders" USING btree ("parent_folder_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resources" ADD CONSTRAINT "resources_folder_id_resource_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."resource_folders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resources_folder_id_idx" ON "resources" USING btree ("folder_id");