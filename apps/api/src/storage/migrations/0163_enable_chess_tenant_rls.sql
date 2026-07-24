-- Enable tenant RLS for chess domain tables (created after bulk RLS migrations).
ALTER TABLE "chess_exercises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chess_games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chess_exercise_attempts" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chess_exercises' AND policyname = 'chess_exercises_tenant_isolation'
  ) THEN
    CREATE POLICY chess_exercises_tenant_isolation
      ON public.chess_exercises
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chess_games' AND policyname = 'chess_games_tenant_isolation'
  ) THEN
    CREATE POLICY chess_games_tenant_isolation
      ON public.chess_games
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_exercise_attempts' AND policyname = 'chess_exercise_attempts_tenant_isolation'
  ) THEN
    CREATE POLICY chess_exercise_attempts_tenant_isolation
      ON public.chess_exercise_attempts
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
