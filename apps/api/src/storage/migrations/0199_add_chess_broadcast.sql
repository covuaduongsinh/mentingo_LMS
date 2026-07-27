CREATE TABLE IF NOT EXISTS "chess_broadcast_game_moves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"ply" integer NOT NULL,
	"uci" varchar(10) NOT NULL,
	"san" varchar(20) NOT NULL,
	"fen_after" varchar(100) NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_broadcast_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"round_id" uuid NOT NULL,
	"board_number" integer NOT NULL,
	"white_name" text NOT NULL,
	"black_name" text NOT NULL,
	"white_team_id" uuid,
	"black_team_id" uuid,
	"result" varchar(10),
	"current_fen" varchar(100) DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' NOT NULL,
	"pgn_source_url" text,
	"last_fetched_at" timestamp with time zone,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_broadcast_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"broadcast_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_broadcast_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"broadcast_id" uuid NOT NULL,
	"name" text NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_broadcasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"delay_minutes" integer DEFAULT 15 NOT NULL,
	"created_by_user_id" uuid,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_broadcast_game_moves" ADD CONSTRAINT "chess_broadcast_game_moves_game_id_chess_broadcast_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."chess_broadcast_games"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_broadcast_game_moves" ADD CONSTRAINT "chess_broadcast_game_moves_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_broadcast_games" ADD CONSTRAINT "chess_broadcast_games_round_id_chess_broadcast_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."chess_broadcast_rounds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_broadcast_games" ADD CONSTRAINT "chess_broadcast_games_white_team_id_chess_broadcast_teams_id_fk" FOREIGN KEY ("white_team_id") REFERENCES "public"."chess_broadcast_teams"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_broadcast_games" ADD CONSTRAINT "chess_broadcast_games_black_team_id_chess_broadcast_teams_id_fk" FOREIGN KEY ("black_team_id") REFERENCES "public"."chess_broadcast_teams"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_broadcast_games" ADD CONSTRAINT "chess_broadcast_games_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_broadcast_rounds" ADD CONSTRAINT "chess_broadcast_rounds_broadcast_id_chess_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."chess_broadcasts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_broadcast_rounds" ADD CONSTRAINT "chess_broadcast_rounds_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_broadcast_teams" ADD CONSTRAINT "chess_broadcast_teams_broadcast_id_chess_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."chess_broadcasts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_broadcast_teams" ADD CONSTRAINT "chess_broadcast_teams_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_broadcasts" ADD CONSTRAINT "chess_broadcasts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_broadcasts" ADD CONSTRAINT "chess_broadcasts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_broadcast_game_moves_tenant_id_idx" ON "chess_broadcast_game_moves" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chess_broadcast_game_moves_game_ply_unique_idx" ON "chess_broadcast_game_moves" USING btree ("game_id","ply");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_broadcast_games_tenant_id_idx" ON "chess_broadcast_games" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_broadcast_games_round_id_idx" ON "chess_broadcast_games" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_broadcast_games_white_team_id_idx" ON "chess_broadcast_games" USING btree ("white_team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_broadcast_games_black_team_id_idx" ON "chess_broadcast_games" USING btree ("black_team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_broadcast_rounds_tenant_id_idx" ON "chess_broadcast_rounds" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_broadcast_rounds_broadcast_id_idx" ON "chess_broadcast_rounds" USING btree ("broadcast_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_broadcast_teams_tenant_id_idx" ON "chess_broadcast_teams" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_broadcast_teams_broadcast_id_idx" ON "chess_broadcast_teams" USING btree ("broadcast_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_broadcasts_tenant_id_idx" ON "chess_broadcasts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_broadcasts_status_idx" ON "chess_broadcasts" USING btree ("status");