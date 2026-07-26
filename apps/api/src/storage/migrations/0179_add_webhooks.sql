CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"webhook_endpoint_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"status_code" integer,
	"success" boolean NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"error_message" text,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"url" varchar(2048) NOT NULL,
	"events_subscribed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"secret_ciphertext" text NOT NULL,
	"secret_iv" text NOT NULL,
	"secret_tag" text NOT NULL,
	"secret_dek_iv" text NOT NULL,
	"secret_encrypted_dek" text NOT NULL,
	"secret_dek_tag" text NOT NULL,
	"tenant_id" uuid DEFAULT current_setting('app.tenant_id', true)::uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("webhook_endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_deliveries_tenant_id_idx" ON "webhook_deliveries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_deliveries_webhook_endpoint_id_idx" ON "webhook_deliveries" USING btree ("webhook_endpoint_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_endpoints_tenant_id_idx" ON "webhook_endpoints" USING btree ("tenant_id");