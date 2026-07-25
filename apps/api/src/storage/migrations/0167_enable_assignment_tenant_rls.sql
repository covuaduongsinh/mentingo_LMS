-- Enable tenant RLS for the assignment engine (tables created in 0166, after bulk RLS migrations).
ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignment_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignment_task_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignment_user_submissions" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'assignments' AND policyname = 'assignments_tenant_isolation'
  ) THEN
    CREATE POLICY assignments_tenant_isolation
      ON public.assignments
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'assignment_tasks' AND policyname = 'assignment_tasks_tenant_isolation'
  ) THEN
    CREATE POLICY assignment_tasks_tenant_isolation
      ON public.assignment_tasks
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'assignment_task_submissions' AND policyname = 'assignment_task_submissions_tenant_isolation'
  ) THEN
    CREATE POLICY assignment_task_submissions_tenant_isolation
      ON public.assignment_task_submissions
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'assignment_user_submissions' AND policyname = 'assignment_user_submissions_tenant_isolation'
  ) THEN
    CREATE POLICY assignment_user_submissions_tenant_isolation
      ON public.assignment_user_submissions
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
