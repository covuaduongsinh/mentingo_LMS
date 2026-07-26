-- Enable tenant RLS for chess_studies, chess_study_chapters, and chess_study_members (created after bulk RLS migrations).
ALTER TABLE "chess_studies" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_studies' AND policyname = 'chess_studies_tenant_isolation'
  ) THEN
    CREATE POLICY chess_studies_tenant_isolation
      ON public.chess_studies
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "chess_study_chapters" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_study_chapters' AND policyname = 'chess_study_chapters_tenant_isolation'
  ) THEN
    CREATE POLICY chess_study_chapters_tenant_isolation
      ON public.chess_study_chapters
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "chess_study_members" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_study_members' AND policyname = 'chess_study_members_tenant_isolation'
  ) THEN
    CREATE POLICY chess_study_members_tenant_isolation
      ON public.chess_study_members
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
