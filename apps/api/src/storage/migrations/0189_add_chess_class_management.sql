CREATE TABLE IF NOT EXISTS "chess_class_login_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"consumed_at" timestamp (3) with time zone,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_managed_account" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "managed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "real_name" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_class_login_codes" ADD CONSTRAINT "chess_class_login_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_class_login_codes" ADD CONSTRAINT "chess_class_login_codes_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chess_class_login_codes" ADD CONSTRAINT "chess_class_login_codes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_class_login_codes_tenant_id_idx" ON "chess_class_login_codes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_class_login_codes_code_hash_idx" ON "chess_class_login_codes" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chess_class_login_codes_group_id_idx" ON "chess_class_login_codes" USING btree ("group_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_managed_by_user_id_users_id_fk" FOREIGN KEY ("managed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
