CREATE TABLE IF NOT EXISTS "chess_learn_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"user_id" uuid NOT NULL,
	"stage_id" varchar(100) NOT NULL,
	"level_id" varchar(100) NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL,
	CONSTRAINT "chess_learn_progress_user_id_stage_id_level_id_unique" UNIQUE("user_id","stage_id","level_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_practice_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"chapter_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"moves_used" integer NOT NULL,
	"achieved_goal" boolean NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chess_study_chapters" ADD COLUMN "practice_goal_type" text;--> statement-breakpoint
ALTER TABLE "chess_study_chapters" ADD COLUMN "practice_goal_target_value" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_learn_progress" ADD CONSTRAINT "chess_learn_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_learn_progress" ADD CONSTRAINT "chess_learn_progress_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_practice_attempts" ADD CONSTRAINT "chess_practice_attempts_chapter_id_chess_study_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chess_study_chapters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_practice_attempts" ADD CONSTRAINT "chess_practice_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_practice_attempts" ADD CONSTRAINT "chess_practice_attempts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_learn_progress_tenant_id_idx" ON "chess_learn_progress" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_practice_attempts_tenant_id_idx" ON "chess_practice_attempts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_practice_attempts_chapter_id_idx" ON "chess_practice_attempts" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_practice_attempts_user_id_idx" ON "chess_practice_attempts" USING btree ("user_id");