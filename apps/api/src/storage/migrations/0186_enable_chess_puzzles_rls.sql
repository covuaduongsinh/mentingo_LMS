-- Enable tenant RLS for chess_puzzles, chess_puzzle_attempts, chess_ratings, and chess_rating_history.
ALTER TABLE "chess_puzzles" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_puzzles' AND policyname = 'chess_puzzles_tenant_isolation'
  ) THEN
    CREATE POLICY chess_puzzles_tenant_isolation
      ON public.chess_puzzles
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "chess_puzzle_attempts" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_puzzle_attempts' AND policyname = 'chess_puzzle_attempts_tenant_isolation'
  ) THEN
    CREATE POLICY chess_puzzle_attempts_tenant_isolation
      ON public.chess_puzzle_attempts
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "chess_ratings" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_ratings' AND policyname = 'chess_ratings_tenant_isolation'
  ) THEN
    CREATE POLICY chess_ratings_tenant_isolation
      ON public.chess_ratings
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "chess_rating_history" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_rating_history' AND policyname = 'chess_rating_history_tenant_isolation'
  ) THEN
    CREATE POLICY chess_rating_history_tenant_isolation
      ON public.chess_rating_history
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
