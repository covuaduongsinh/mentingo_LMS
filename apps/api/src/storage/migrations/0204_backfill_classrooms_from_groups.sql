-- Backfill: one classrooms row per pre-existing `groups` row that already has at least
-- one teacher-managed chess-class student (Đợt L5, chess_class module), so the old
-- /admin/chess/classes/:groupId UI has a corresponding /classrooms/:classroomId to redirect
-- to (Đợt C2, docs/specs/classroom-business-spec.md). Idempotent via ON CONFLICT on the
-- unique classrooms.source_group_id — safe to re-run. Purely additive: never touches
-- groups/group_users, and only INSERTs into the new classroom_* tables.
WITH managed_counts AS (
  SELECT
    gu.group_id,
    g.tenant_id,
    u.managed_by_user_id AS owner_id,
    COUNT(*) AS student_count
  FROM group_users gu
  JOIN users u ON u.id = gu.user_id AND u.is_managed_account = true
  JOIN groups g ON g.id = gu.group_id
  WHERE u.managed_by_user_id IS NOT NULL
  GROUP BY gu.group_id, g.tenant_id, u.managed_by_user_id
),
-- Owner = whichever teacher manages the most students within that group (ties broken by
-- owner_id for determinism across re-runs).
group_owner AS (
  SELECT DISTINCT ON (group_id)
    group_id,
    tenant_id,
    owner_id
  FROM managed_counts
  ORDER BY group_id, student_count DESC, owner_id
),
inserted_classrooms AS (
  INSERT INTO classrooms (name, owner_id, source_group_id, tenant_id, viewed_at)
  SELECT
    COALESCE(NULLIF(g.name->>'en', ''), NULLIF(g.name->>'vi', ''), 'Untitled classroom'),
    go.owner_id,
    go.group_id,
    go.tenant_id,
    now()
  FROM group_owner go
  JOIN groups g ON g.id = go.group_id
  ON CONFLICT (source_group_id) DO NOTHING
  RETURNING id, source_group_id, tenant_id, owner_id
)
INSERT INTO classroom_teachers (classroom_id, user_id, added_by, tenant_id)
SELECT ic.id, ic.owner_id, ic.owner_id, ic.tenant_id
FROM inserted_classrooms ic
ON CONFLICT (classroom_id, user_id) DO NOTHING;
--> statement-breakpoint

-- Students: every teacher-managed member of the source group, mirrored as an active
-- classroom_students row. Only runs for classrooms inserted just above in this same
-- migration run (source_group_id already existed on a prior run ⇒ nothing to mirror again).
WITH newly_inserted AS (
  SELECT c.id, c.source_group_id, c.owner_id, c.tenant_id
  FROM classrooms c
  WHERE c.source_group_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM classroom_students cs WHERE cs.classroom_id = c.id
    )
)
INSERT INTO classroom_students (classroom_id, user_id, real_name, is_managed, added_by, tenant_id)
SELECT
  ni.id,
  u.id,
  COALESCE(NULLIF(u.real_name, ''), NULLIF(u.username, ''), 'Học sinh'),
  true,
  ni.owner_id,
  ni.tenant_id
FROM newly_inserted ni
JOIN group_users gu ON gu.group_id = ni.source_group_id
JOIN users u ON u.id = gu.user_id AND u.is_managed_account = true
ON CONFLICT (classroom_id, user_id) DO NOTHING;
--> statement-breakpoint

-- Bridge chess_class_login_codes.classroom_id from the new mapping — group_id stays
-- authoritative and untouched; classroom_id is additive, backfilled only where still null.
UPDATE chess_class_login_codes lc
SET classroom_id = c.id
FROM classrooms c
WHERE c.source_group_id = lc.group_id
  AND lc.classroom_id IS NULL;
