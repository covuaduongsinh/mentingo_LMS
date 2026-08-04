ALTER TABLE "chess_coordinate_high_scores" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "chess_coordinate_high_scores";
CREATE POLICY tenant_isolation ON "chess_coordinate_high_scores"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
