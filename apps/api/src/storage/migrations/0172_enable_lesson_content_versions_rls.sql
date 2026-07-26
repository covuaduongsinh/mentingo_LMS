-- Enable tenant RLS for lesson_content_versions (created after bulk RLS migrations).
ALTER TABLE "lesson_content_versions" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lesson_content_versions' AND policyname = 'lesson_content_versions_tenant_isolation'
  ) THEN
    CREATE POLICY lesson_content_versions_tenant_isolation
      ON public.lesson_content_versions
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
