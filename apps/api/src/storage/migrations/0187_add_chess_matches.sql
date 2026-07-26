CREATE TABLE IF NOT EXISTS "chess_match_moves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"match_id" uuid NOT NULL,
	"ply" integer NOT NULL,
	"uci" varchar(10) NOT NULL,
	"san" varchar(20) NOT NULL,
	"fen_after" varchar(100) NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"white_user_id" uuid NOT NULL,
	"black_user_id" uuid NOT NULL,
	"time_control_id" varchar(20) NOT NULL,
	"rated" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"result" text,
	"end_reason" text,
	"current_fen" varchar(100) DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' NOT NULL,
	"white_time_remaining_ms" integer NOT NULL,
	"black_time_remaining_ms" integer NOT NULL,
	"last_move_at" timestamp with time zone DEFAULT now() NOT NULL,
	"draw_offered_by_user_id" uuid,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_seeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"challenged_user_id" uuid,
	"time_control_id" varchar(20) NOT NULL,
	"color_preference" text DEFAULT 'random' NOT NULL,
	"rated" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"match_id" uuid,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_match_moves" ADD CONSTRAINT "chess_match_moves_match_id_chess_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."chess_matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_match_moves" ADD CONSTRAINT "chess_match_moves_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_matches" ADD CONSTRAINT "chess_matches_white_user_id_users_id_fk" FOREIGN KEY ("white_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_matches" ADD CONSTRAINT "chess_matches_black_user_id_users_id_fk" FOREIGN KEY ("black_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_matches" ADD CONSTRAINT "chess_matches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_seeks" ADD CONSTRAINT "chess_seeks_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_seeks" ADD CONSTRAINT "chess_seeks_challenged_user_id_users_id_fk" FOREIGN KEY ("challenged_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_seeks" ADD CONSTRAINT "chess_seeks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_match_moves_tenant_id_idx" ON "chess_match_moves" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_match_moves_match_id_idx" ON "chess_match_moves" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_matches_tenant_id_idx" ON "chess_matches" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_matches_status_idx" ON "chess_matches" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_matches_white_user_id_idx" ON "chess_matches" USING btree ("white_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_matches_black_user_id_idx" ON "chess_matches" USING btree ("black_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_seeks_tenant_id_idx" ON "chess_seeks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_seeks_status_idx" ON "chess_seeks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_seeks_challenged_user_id_idx" ON "chess_seeks" USING btree ("challenged_user_id");