CREATE TABLE IF NOT EXISTS "chess_puzzle_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"puzzle_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"correct" boolean NOT NULL,
	"user_rating_before" double precision NOT NULL,
	"user_rating_after" double precision NOT NULL,
	"puzzle_rating_before" double precision NOT NULL,
	"puzzle_rating_after" double precision NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_puzzles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"fen" text NOT NULL,
	"solution_uci" text[] NOT NULL,
	"rating" double precision DEFAULT 1500 NOT NULL,
	"rating_deviation" double precision DEFAULT 350 NOT NULL,
	"volatility" double precision DEFAULT 0.06 NOT NULL,
	"motifs" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"popularity" integer,
	"source" text DEFAULT 'original' NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_rating_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"user_id" uuid NOT NULL,
	"category" text NOT NULL,
	"rating" double precision NOT NULL,
	"rating_deviation" double precision NOT NULL,
	"volatility" double precision NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"user_id" uuid NOT NULL,
	"category" text DEFAULT 'puzzle' NOT NULL,
	"rating" double precision DEFAULT 1500 NOT NULL,
	"rating_deviation" double precision DEFAULT 350 NOT NULL,
	"volatility" double precision DEFAULT 0.06 NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_puzzle_attempts" ADD CONSTRAINT "chess_puzzle_attempts_puzzle_id_chess_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."chess_puzzles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_puzzle_attempts" ADD CONSTRAINT "chess_puzzle_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_puzzle_attempts" ADD CONSTRAINT "chess_puzzle_attempts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_puzzles" ADD CONSTRAINT "chess_puzzles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_rating_history" ADD CONSTRAINT "chess_rating_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_rating_history" ADD CONSTRAINT "chess_rating_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_ratings" ADD CONSTRAINT "chess_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_ratings" ADD CONSTRAINT "chess_ratings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_puzzle_attempts_tenant_id_idx" ON "chess_puzzle_attempts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_puzzle_attempts_puzzle_id_idx" ON "chess_puzzle_attempts" USING btree ("puzzle_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_puzzle_attempts_user_id_idx" ON "chess_puzzle_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_puzzle_attempts_user_correct_idx" ON "chess_puzzle_attempts" USING btree ("user_id","correct");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_puzzles_tenant_id_idx" ON "chess_puzzles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_puzzles_rating_idx" ON "chess_puzzles" USING btree ("rating");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_puzzles_motifs_idx" ON "chess_puzzles" USING gin ("motifs");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_rating_history_tenant_id_idx" ON "chess_rating_history" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_rating_history_user_category_idx" ON "chess_rating_history" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_ratings_tenant_id_idx" ON "chess_ratings" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chess_ratings_user_category_unique_idx" ON "chess_ratings" USING btree ("user_id","category");