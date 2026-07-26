CREATE TABLE IF NOT EXISTS "chess_studies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"author_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"topics" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"source_study_id" uuid,
	"chapter_count" integer DEFAULT 0 NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_study_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"study_id" uuid NOT NULL,
	"title" text NOT NULL,
	"root_fen" varchar(100) DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' NOT NULL,
	"move_nodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mode" text DEFAULT 'normal' NOT NULL,
	"conceal_from_ply" integer,
	"practice_goal" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chess_study_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"study_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'read' NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_studies" ADD CONSTRAINT "chess_studies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_studies" ADD CONSTRAINT "chess_studies_source_study_id_chess_studies_id_fk" FOREIGN KEY ("source_study_id") REFERENCES "public"."chess_studies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_studies" ADD CONSTRAINT "chess_studies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_study_chapters" ADD CONSTRAINT "chess_study_chapters_study_id_chess_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."chess_studies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_study_chapters" ADD CONSTRAINT "chess_study_chapters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_study_members" ADD CONSTRAINT "chess_study_members_study_id_chess_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."chess_studies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_study_members" ADD CONSTRAINT "chess_study_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_study_members" ADD CONSTRAINT "chess_study_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_studies_tenant_id_idx" ON "chess_studies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_studies_visibility_idx" ON "chess_studies" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_studies_author_id_idx" ON "chess_studies" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_study_chapters_tenant_id_idx" ON "chess_study_chapters" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_study_chapters_study_id_idx" ON "chess_study_chapters" USING btree ("study_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_study_members_tenant_id_idx" ON "chess_study_members" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chess_study_members_study_user_unique_idx" ON "chess_study_members" USING btree ("study_id","user_id");