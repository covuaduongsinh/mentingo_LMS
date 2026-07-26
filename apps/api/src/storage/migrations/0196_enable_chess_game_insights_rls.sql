-- Enable tenant RLS for chess_game_insights.
ALTER TABLE "chess_game_insights" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_game_insights' AND policyname = 'chess_game_insights_tenant_isolation'
  ) THEN
    CREATE POLICY chess_game_insights_tenant_isolation
      ON public.chess_game_insights
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
