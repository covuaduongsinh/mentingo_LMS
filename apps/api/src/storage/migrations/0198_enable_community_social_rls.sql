-- Enable tenant RLS for community_conversations, community_messages, and community_user_relationships.
ALTER TABLE "community_conversations" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'community_conversations' AND policyname = 'community_conversations_tenant_isolation'
  ) THEN
    CREATE POLICY community_conversations_tenant_isolation
      ON public.community_conversations
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "community_messages" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'community_messages' AND policyname = 'community_messages_tenant_isolation'
  ) THEN
    CREATE POLICY community_messages_tenant_isolation
      ON public.community_messages
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

ALTER TABLE "community_user_relationships" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'community_user_relationships' AND policyname = 'community_user_relationships_tenant_isolation'
  ) THEN
    CREATE POLICY community_user_relationships_tenant_isolation
      ON public.community_user_relationships
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
