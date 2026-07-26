CREATE TABLE IF NOT EXISTS "chess_analysis_session_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(10) NOT NULL,
	"first_joined_at" timestamp(3) with time zone,
	"last_left_at" timestamp(3) with time zone,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_analysis_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"host_user_id" uuid,
	"name" varchar(255),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"current_fen" varchar(100) DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' NOT NULL,
	"move_list" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ended_at" timestamp(3) with time zone,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_analysis_session_participants" ADD CONSTRAINT "chess_analysis_session_participants_session_id_chess_analysis_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chess_analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_analysis_session_participants" ADD CONSTRAINT "chess_analysis_session_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_analysis_session_participants" ADD CONSTRAINT "chess_analysis_session_participants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_analysis_sessions" ADD CONSTRAINT "chess_analysis_sessions_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_analysis_sessions" ADD CONSTRAINT "chess_analysis_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_analysis_session_participants_tenant_id_idx" ON "chess_analysis_session_participants" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chess_analysis_session_participants_session_user_unique_idx" ON "chess_analysis_session_participants" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_analysis_sessions_tenant_id_idx" ON "chess_analysis_sessions" USING btree ("tenant_id");