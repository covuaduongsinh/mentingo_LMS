CREATE TABLE IF NOT EXISTS "chess_play_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"user_id" uuid NOT NULL,
	"player_color" text NOT NULL,
	"level" text NOT NULL,
	"engine" text NOT NULL,
	"outcome" text NOT NULL,
	"end_reason" text NOT NULL,
	"pgn" text NOT NULL,
	"moves_uci" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"time_control" text,
	"player_time_left_ms" integer,
	"engine_time_left_ms" integer,
	"duration_ms" integer,
	"move_count" integer DEFAULT 0 NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_play_sessions" ADD CONSTRAINT "chess_play_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_play_sessions" ADD CONSTRAINT "chess_play_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_play_sessions_tenant_id_idx" ON "chess_play_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_play_sessions_user_created_idx" ON "chess_play_sessions" USING btree ("user_id","created_at");