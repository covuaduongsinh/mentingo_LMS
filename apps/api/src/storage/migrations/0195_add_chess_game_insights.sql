CREATE TABLE IF NOT EXISTS "chess_game_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"ply" integer NOT NULL,
	"phase" text NOT NULL,
	"piece_type" text NOT NULL,
	"opening_key" varchar(60) NOT NULL,
	"evaluation_cp_before" integer NOT NULL,
	"evaluation_cp_after" integer NOT NULL,
	"centipawn_loss" integer NOT NULL,
	"accuracy" double precision NOT NULL,
	"move_quality" text NOT NULL,
	"think_time_ms" integer NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_game_insights" ADD CONSTRAINT "chess_game_insights_match_id_chess_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."chess_matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_game_insights" ADD CONSTRAINT "chess_game_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_game_insights" ADD CONSTRAINT "chess_game_insights_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_game_insights_tenant_id_idx" ON "chess_game_insights" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chess_game_insights_match_ply_unique_idx" ON "chess_game_insights" USING btree ("match_id","ply");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_game_insights_user_id_idx" ON "chess_game_insights" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_game_insights_user_phase_idx" ON "chess_game_insights" USING btree ("user_id","phase");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_game_insights_user_piece_type_idx" ON "chess_game_insights" USING btree ("user_id","piece_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_game_insights_user_opening_key_idx" ON "chess_game_insights" USING btree ("user_id","opening_key");