CREATE TABLE IF NOT EXISTS "chess_coordinate_high_scores" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "mode" varchar(20) NOT NULL,
  "orientation" varchar(10) NOT NULL,
  "best_score" integer DEFAULT 0 NOT NULL,
  "tenant_id" uuid NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "chess_coordinate_high_scores_user_mode_orient_uidx"
  ON "chess_coordinate_high_scores" ("user_id", "mode", "orientation");

CREATE INDEX IF NOT EXISTS "chess_coordinate_high_scores_tenant_id_idx"
  ON "chess_coordinate_high_scores" ("tenant_id");
