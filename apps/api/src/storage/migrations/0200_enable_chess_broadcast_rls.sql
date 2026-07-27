-- Enable tenant RLS for chess_broadcasts, chess_broadcast_rounds, chess_broadcast_teams,
-- chess_broadcast_games, and chess_broadcast_game_moves.
ALTER TABLE "chess_broadcasts" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_broadcasts' AND policyname = 'chess_broadcasts_tenant_isolation'
  ) THEN
    CREATE POLICY chess_broadcasts_tenant_isolation
      ON public.chess_broadcasts
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "chess_broadcast_rounds" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_broadcast_rounds' AND policyname = 'chess_broadcast_rounds_tenant_isolation'
  ) THEN
    CREATE POLICY chess_broadcast_rounds_tenant_isolation
      ON public.chess_broadcast_rounds
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "chess_broadcast_teams" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_broadcast_teams' AND policyname = 'chess_broadcast_teams_tenant_isolation'
  ) THEN
    CREATE POLICY chess_broadcast_teams_tenant_isolation
      ON public.chess_broadcast_teams
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "chess_broadcast_games" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_broadcast_games' AND policyname = 'chess_broadcast_games_tenant_isolation'
  ) THEN
    CREATE POLICY chess_broadcast_games_tenant_isolation
      ON public.chess_broadcast_games
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "chess_broadcast_game_moves" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_broadcast_game_moves' AND policyname = 'chess_broadcast_game_moves_tenant_isolation'
  ) THEN
    CREATE POLICY chess_broadcast_game_moves_tenant_isolation
      ON public.chess_broadcast_game_moves
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
