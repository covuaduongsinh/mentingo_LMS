-- Enable tenant RLS for ai_generations (created after bulk RLS migrations).
ALTER TABLE "ai_generations" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_generations' AND policyname = 'ai_generations_tenant_isolation'
  ) THEN
    CREATE POLICY ai_generations_tenant_isolation
      ON public.ai_generations
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
