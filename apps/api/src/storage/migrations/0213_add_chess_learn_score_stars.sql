ALTER TABLE "chess_learn_progress" ADD COLUMN IF NOT EXISTS "best_score" integer DEFAULT 0 NOT NULL;
ALTER TABLE "chess_learn_progress" ADD COLUMN IF NOT EXISTS "best_stars" integer DEFAULT 0 NOT NULL;
ALTER TABLE "chess_learn_progress" ADD COLUMN IF NOT EXISTS "best_moves_used" integer;
ALTER TABLE "chess_learn_progress" ADD COLUMN IF NOT EXISTS "attempt_count" integer DEFAULT 0 NOT NULL;

-- L7 only inserted rows on correct attempts; treat legacy rows as 3-star perfect solves.
UPDATE "chess_learn_progress"
SET
  "best_score" = 500,
  "best_stars" = 3,
  "attempt_count" = GREATEST("attempt_count", 1)
WHERE "best_stars" = 0;
