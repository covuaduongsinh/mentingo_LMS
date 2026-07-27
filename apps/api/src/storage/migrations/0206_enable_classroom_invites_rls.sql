-- Enable tenant RLS for classroom_invites.
ALTER TABLE "classroom_invites" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'classroom_invites' AND policyname = 'classroom_invites_tenant_isolation'
  ) THEN
    CREATE POLICY classroom_invites_tenant_isolation
      ON public.classroom_invites
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
