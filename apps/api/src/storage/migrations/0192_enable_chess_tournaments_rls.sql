-- Enable tenant RLS for chess_tournaments, chess_tournament_players, and chess_tournament_pairings.
ALTER TABLE "chess_tournaments" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_tournaments' AND policyname = 'chess_tournaments_tenant_isolation'
  ) THEN
    CREATE POLICY chess_tournaments_tenant_isolation
      ON public.chess_tournaments
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "chess_tournament_players" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_tournament_players' AND policyname = 'chess_tournament_players_tenant_isolation'
  ) THEN
    CREATE POLICY chess_tournament_players_tenant_isolation
      ON public.chess_tournament_players
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "chess_tournament_pairings" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_tournament_pairings' AND policyname = 'chess_tournament_pairings_tenant_isolation'
  ) THEN
    CREATE POLICY chess_tournament_pairings_tenant_isolation
      ON public.chess_tournament_pairings
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
