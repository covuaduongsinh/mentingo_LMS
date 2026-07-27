ALTER TABLE "chess_class_login_codes" ADD COLUMN "classroom_id" uuid;--> statement-breakpoint
ALTER TABLE "classrooms" ADD COLUMN "source_group_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_class_login_codes" ADD CONSTRAINT "chess_class_login_codes_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_source_group_id_groups_id_fk" FOREIGN KEY ("source_group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_class_login_codes_classroom_id_idx" ON "chess_class_login_codes" USING btree ("classroom_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "classrooms_source_group_id_unique_idx" ON "classrooms" USING btree ("source_group_id");