-- Enable tenant RLS for webhook_endpoints and webhook_deliveries (created after bulk RLS migrations).
ALTER TABLE "webhook_endpoints" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'webhook_endpoints' AND policyname = 'webhook_endpoints_tenant_isolation'
  ) THEN
    CREATE POLICY webhook_endpoints_tenant_isolation
      ON public.webhook_endpoints
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "webhook_deliveries" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'webhook_deliveries' AND policyname = 'webhook_deliveries_tenant_isolation'
  ) THEN
    CREATE POLICY webhook_deliveries_tenant_isolation
      ON public.webhook_deliveries
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
