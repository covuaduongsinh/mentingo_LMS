CREATE TABLE IF NOT EXISTS "lesson_chess_studies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp (3) DEFAULT now() NOT NULL,
  "updated_at" timestamp (3) DEFAULT now() NOT NULL,
  "lesson_id" uuid NOT NULL,
  "study_id" uuid,
  "study_chapter_id" uuid,
  "tenant_id" uuid NOT NULL,
  CONSTRAINT "lesson_chess_studies_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "lesson_chess_studies_study_id_chess_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."chess_studies"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "lesson_chess_studies_study_chapter_id_chess_study_chapters_id_fk" FOREIGN KEY ("study_chapter_id") REFERENCES "public"."chess_study_chapters"("id") ON DELETE set null ON UPDATE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS "lesson_chess_studies_lesson_id_unique_idx" ON "lesson_chess_studies" USING btree ("lesson_id");
CREATE INDEX IF NOT EXISTS "lesson_chess_studies_tenant_id_idx" ON "lesson_chess_studies" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "lesson_chess_studies_study_id_idx" ON "lesson_chess_studies" USING btree ("study_id");

ALTER TABLE "lesson_chess_studies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "lesson_chess_studies" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant')::uuid);
