ALTER TABLE "certificates" ADD COLUMN "share_token" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_share_token_unique_idx" ON "certificates" USING btree ("share_token");