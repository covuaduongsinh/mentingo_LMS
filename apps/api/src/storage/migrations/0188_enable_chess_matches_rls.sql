-- Enable tenant RLS for chess_seeks, chess_matches, and chess_match_moves.
ALTER TABLE "chess_seeks" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_seeks' AND policyname = 'chess_seeks_tenant_isolation'
  ) THEN
    CREATE POLICY chess_seeks_tenant_isolation
      ON public.chess_seeks
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "chess_matches" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_matches' AND policyname = 'chess_matches_tenant_isolation'
  ) THEN
    CREATE POLICY chess_matches_tenant_isolation
      ON public.chess_matches
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "chess_match_moves" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_match_moves' AND policyname = 'chess_match_moves_tenant_isolation'
  ) THEN
    CREATE POLICY chess_match_moves_tenant_isolation
      ON public.chess_match_moves
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
