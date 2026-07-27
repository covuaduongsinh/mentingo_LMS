CREATE TABLE IF NOT EXISTS "classroom_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"classroom_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"real_name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_by" uuid,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_invites" ADD CONSTRAINT "classroom_invites_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_invites" ADD CONSTRAINT "classroom_invites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_invites" ADD CONSTRAINT "classroom_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_invites" ADD CONSTRAINT "classroom_invites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "classroom_invites_tenant_id_idx" ON "classroom_invites" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "classroom_invites_user_id_idx" ON "classroom_invites" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "classroom_invites_pending_unique_idx" ON "classroom_invites" USING btree ("classroom_id","user_id") WHERE "classroom_invites"."status" = 'pending';