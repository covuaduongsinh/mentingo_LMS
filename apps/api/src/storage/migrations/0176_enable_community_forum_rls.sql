-- Enable tenant RLS for community forum tables (created after bulk RLS migrations).
ALTER TABLE "community_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "community_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "community_votes" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'community_posts' AND policyname = 'community_posts_tenant_isolation'
  ) THEN
    CREATE POLICY community_posts_tenant_isolation
      ON public.community_posts
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'community_comments' AND policyname = 'community_comments_tenant_isolation'
  ) THEN
    CREATE POLICY community_comments_tenant_isolation
      ON public.community_comments
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'community_votes' AND policyname = 'community_votes_tenant_isolation'
  ) THEN
    CREATE POLICY community_votes_tenant_isolation
      ON public.community_votes
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
