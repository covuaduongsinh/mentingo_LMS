-- Enable tenant RLS for chess_learn_progress and chess_practice_attempts.
ALTER TABLE "chess_learn_progress" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_learn_progress' AND policyname = 'chess_learn_progress_tenant_isolation'
  ) THEN
    CREATE POLICY chess_learn_progress_tenant_isolation
      ON public.chess_learn_progress
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "chess_practice_attempts" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_practice_attempts' AND policyname = 'chess_practice_attempts_tenant_isolation'
  ) THEN
    CREATE POLICY chess_practice_attempts_tenant_isolation
      ON public.chess_practice_attempts
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
