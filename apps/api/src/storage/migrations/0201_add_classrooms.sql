CREATE TABLE IF NOT EXISTS "classroom_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"classroom_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"real_name" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"is_managed" boolean DEFAULT false NOT NULL,
	"added_by" uuid,
	"archived_at" timestamp(3) with time zone,
	"archived_by" uuid,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "classroom_teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"classroom_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"added_by" uuid,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "classrooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"wall" text DEFAULT '' NOT NULL,
	"owner_id" uuid,
	"can_msg" boolean DEFAULT false NOT NULL,
	"max_students" integer DEFAULT 100 NOT NULL,
	"viewed_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"archived_at" timestamp(3) with time zone,
	"archived_by" uuid,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_students" ADD CONSTRAINT "classroom_students_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_students" ADD CONSTRAINT "classroom_students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_students" ADD CONSTRAINT "classroom_students_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_students" ADD CONSTRAINT "classroom_students_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_students" ADD CONSTRAINT "classroom_students_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_teachers" ADD CONSTRAINT "classroom_teachers_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_teachers" ADD CONSTRAINT "classroom_teachers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_teachers" ADD CONSTRAINT "classroom_teachers_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_teachers" ADD CONSTRAINT "classroom_teachers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "classroom_students_tenant_id_idx" ON "classroom_students" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "classroom_students_classroom_user_unique_idx" ON "classroom_students" USING btree ("classroom_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "classroom_students_user_id_idx" ON "classroom_students" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "classroom_students_classroom_id_active_idx" ON "classroom_students" USING btree ("classroom_id") WHERE "classroom_students"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "classroom_teachers_tenant_id_idx" ON "classroom_teachers" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "classroom_teachers_classroom_user_unique_idx" ON "classroom_teachers" USING btree ("classroom_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "classroom_teachers_user_id_idx" ON "classroom_teachers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "classrooms_tenant_id_idx" ON "classrooms" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "classrooms_owner_id_idx" ON "classrooms" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "classrooms_viewed_at_idx" ON "classrooms" USING btree ("viewed_at");