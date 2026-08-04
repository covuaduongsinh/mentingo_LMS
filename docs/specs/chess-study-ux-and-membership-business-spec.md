# Chess Study UX Discovery & Membership — Business Spec

> Clean-room business spec (AGPL reference surveyed separately). Đợt **S3**.

## Features

1. **List filters**: mine · shared-with-me (member, not owner) · all visible (default). Search title, topic, sort by updatedAt.
2. **allowClone** boolean on study (default true). Clone refused with 403 if false and not owner/admin.
3. **Invite by identity**: body `{ identity: string, role? }` where identity is email or username in tenant; resolve user; same rules as add member by id.
4. **UI**: filter chips, clone button already exists, invite field accepts email/username (not only UUID).
5. **No** unlisted, **no** likes.

## Technical

- Column `allow_clone` on `chess_studies`.
- Query param `shared=true` for member-only list.
- Method names: `inviteStudyMember` (unique).
