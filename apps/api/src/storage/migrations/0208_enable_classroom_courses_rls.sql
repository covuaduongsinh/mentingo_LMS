-- Custom SQL migration file, put you code below! --

-- Enable tenant RLS for classroom_courses.
ALTER TABLE "classroom_courses" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'classroom_courses' AND policyname = 'classroom_courses_tenant_isolation'
  ) THEN
    CREATE POLICY classroom_courses_tenant_isolation
      ON public.classroom_courses
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
