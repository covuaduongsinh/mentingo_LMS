-- Enable tenant RLS for chess_analysis_sessions and chess_analysis_session_participants (created after bulk RLS migrations).
ALTER TABLE "chess_analysis_sessions" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_analysis_sessions' AND policyname = 'chess_analysis_sessions_tenant_isolation'
  ) THEN
    CREATE POLICY chess_analysis_sessions_tenant_isolation
      ON public.chess_analysis_sessions
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "chess_analysis_session_participants" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_analysis_session_participants' AND policyname = 'chess_analysis_session_participants_tenant_isolation'
  ) THEN
    CREATE POLICY chess_analysis_session_participants_tenant_isolation
      ON public.chess_analysis_session_participants
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
