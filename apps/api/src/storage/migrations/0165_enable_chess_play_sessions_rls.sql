-- Enable tenant RLS for chess_play_sessions (table created in 0164, after bulk RLS migrations).
ALTER TABLE "chess_play_sessions" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_play_sessions' AND policyname = 'chess_play_sessions_tenant_isolation'
  ) THEN
    CREATE POLICY chess_play_sessions_tenant_isolation
      ON public.chess_play_sessions
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
