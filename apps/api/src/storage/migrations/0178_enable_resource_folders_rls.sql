-- Enable tenant RLS for resource_folders (created after bulk RLS migrations).
ALTER TABLE "resource_folders" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'resource_folders' AND policyname = 'resource_folders_tenant_isolation'
  ) THEN
    CREATE POLICY resource_folders_tenant_isolation
      ON public.resource_folders
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
