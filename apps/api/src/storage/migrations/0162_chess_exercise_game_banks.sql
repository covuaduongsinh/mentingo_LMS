CREATE TABLE IF NOT EXISTS "chess_exercise_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"exercise_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_correct" boolean NOT NULL,
	"answer" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"time_ms" integer,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"title" text NOT NULL,
	"audience" text DEFAULT 'student' NOT NULL,
	"topics" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"difficulty" integer DEFAULT 3 NOT NULL,
	"format" text NOT NULL,
	"fen" text,
	"solution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"explanation" text,
	"source" text DEFAULT 'original' NOT NULL,
	"piece_count" integer,
	"rating" integer,
	"published" boolean DEFAULT false NOT NULL,
	"author_id" uuid,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"title" text NOT NULL,
	"pgn" text NOT NULL,
	"topics" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"level" text DEFAULT 'beginner' NOT NULL,
	"teaching_notes" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"author_id" uuid,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_exercise_attempts" ADD CONSTRAINT "chess_exercise_attempts_exercise_id_chess_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."chess_exercises"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_exercise_attempts" ADD CONSTRAINT "chess_exercise_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_exercise_attempts" ADD CONSTRAINT "chess_exercise_attempts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_exercises" ADD CONSTRAINT "chess_exercises_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_exercises" ADD CONSTRAINT "chess_exercises_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_games" ADD CONSTRAINT "chess_games_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_games" ADD CONSTRAINT "chess_games_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_exercise_attempts_tenant_id_idx" ON "chess_exercise_attempts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_exercise_attempts_exercise_user_idx" ON "chess_exercise_attempts" USING btree ("exercise_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_exercises_tenant_id_idx" ON "chess_exercises" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_exercises_published_idx" ON "chess_exercises" USING btree ("published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_exercises_format_idx" ON "chess_exercises" USING btree ("format");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_exercises_difficulty_idx" ON "chess_exercises" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_games_tenant_id_idx" ON "chess_games" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_games_published_idx" ON "chess_games" USING btree ("published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_games_level_idx" ON "chess_games" USING btree ("level");