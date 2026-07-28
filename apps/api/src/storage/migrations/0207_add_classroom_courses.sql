CREATE TABLE IF NOT EXISTS "classroom_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"classroom_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"enrolled_by" uuid,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"due_date" timestamp with time zone,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL,
	CONSTRAINT "classroom_courses_classroom_id_course_id_unique" UNIQUE("classroom_id","course_id")
);
--> statement-breakpoint
ALTER TABLE "chess_tournaments" ADD COLUMN "classroom_id" uuid;--> statement-breakpoint
ALTER TABLE "student_courses" ADD COLUMN "enrolled_by_classroom_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_courses" ADD CONSTRAINT "classroom_courses_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_courses" ADD CONSTRAINT "classroom_courses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_courses" ADD CONSTRAINT "classroom_courses_enrolled_by_users_id_fk" FOREIGN KEY ("enrolled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_courses" ADD CONSTRAINT "classroom_courses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "classroom_courses_tenant_id_idx" ON "classroom_courses" USING btree ("tenant_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_tournaments" ADD CONSTRAINT "chess_tournaments_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_courses" ADD CONSTRAINT "student_courses_enrolled_by_classroom_id_classrooms_id_fk" FOREIGN KEY ("enrolled_by_classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_tournaments_classroom_id_idx" ON "chess_tournaments" USING btree ("classroom_id");