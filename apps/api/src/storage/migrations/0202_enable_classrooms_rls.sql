-- Enable tenant RLS for classrooms, classroom_teachers, and classroom_students.
ALTER TABLE "classrooms" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'classrooms' AND policyname = 'classrooms_tenant_isolation'
  ) THEN
    CREATE POLICY classrooms_tenant_isolation
      ON public.classrooms
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "classroom_teachers" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'classroom_teachers' AND policyname = 'classroom_teachers_tenant_isolation'
  ) THEN
    CREATE POLICY classroom_teachers_tenant_isolation
      ON public.classroom_teachers
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "classroom_students" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'classroom_students' AND policyname = 'classroom_students_tenant_isolation'
  ) THEN
    CREATE POLICY classroom_students_tenant_isolation
      ON public.classroom_students
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
