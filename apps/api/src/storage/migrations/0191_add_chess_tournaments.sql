CREATE TABLE IF NOT EXISTS "chess_tournament_pairings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"white_user_id" uuid NOT NULL,
	"black_user_id" uuid,
	"match_id" uuid,
	"result" text,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_tournament_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"tournament_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL,
	CONSTRAINT "chess_tournament_players_tournament_id_user_id_unique" UNIQUE("tournament_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"name" text NOT NULL,
	"format" text NOT NULL,
	"group_id" uuid,
	"time_control_id" varchar(20) NOT NULL,
	"rated" boolean DEFAULT true NOT NULL,
	"round_count" integer,
	"duration_minutes" integer,
	"host_user_id" uuid,
	"status" text DEFAULT 'registration' NOT NULL,
	"current_round" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"min_rating" integer,
	"max_rating" integer,
	"min_games_played" integer,
	"created_by_user_id" uuid,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_tournament_pairings" ADD CONSTRAINT "chess_tournament_pairings_tournament_id_chess_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."chess_tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_tournament_pairings" ADD CONSTRAINT "chess_tournament_pairings_white_user_id_users_id_fk" FOREIGN KEY ("white_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_tournament_pairings" ADD CONSTRAINT "chess_tournament_pairings_black_user_id_users_id_fk" FOREIGN KEY ("black_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_tournament_pairings" ADD CONSTRAINT "chess_tournament_pairings_match_id_chess_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."chess_matches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_tournament_pairings" ADD CONSTRAINT "chess_tournament_pairings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_tournament_players" ADD CONSTRAINT "chess_tournament_players_tournament_id_chess_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."chess_tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_tournament_players" ADD CONSTRAINT "chess_tournament_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_tournament_players" ADD CONSTRAINT "chess_tournament_players_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_tournaments" ADD CONSTRAINT "chess_tournaments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_tournaments" ADD CONSTRAINT "chess_tournaments_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_tournaments" ADD CONSTRAINT "chess_tournaments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_tournaments" ADD CONSTRAINT "chess_tournaments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_tournament_pairings_tenant_id_idx" ON "chess_tournament_pairings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_tournament_pairings_tournament_id_idx" ON "chess_tournament_pairings" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_tournament_pairings_round_idx" ON "chess_tournament_pairings" USING btree ("round");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_tournament_players_tenant_id_idx" ON "chess_tournament_players" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_tournament_players_tournament_id_idx" ON "chess_tournament_players" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_tournaments_tenant_id_idx" ON "chess_tournaments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_tournaments_status_idx" ON "chess_tournaments" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_tournaments_group_id_idx" ON "chess_tournaments" USING btree ("group_id");