-- Enable tenant RLS for chess_class_login_codes.
ALTER TABLE "chess_class_login_codes" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chess_class_login_codes' AND policyname = 'chess_class_login_codes_tenant_isolation'
  ) THEN
    CREATE POLICY chess_class_login_codes_tenant_isolation
      ON public.chess_class_login_codes
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
