ALTER TABLE "chess_study_chapters" ADD COLUMN IF NOT EXISTS "orientation" text DEFAULT 'white' NOT NULL;
ALTER TABLE "chess_study_chapters" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "chess_study_chapters" ADD COLUMN IF NOT EXISTS "pgn_tags" jsonb DEFAULT '{}'::jsonb NOT NULL;
