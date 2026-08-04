# Chess Study Editing Reliability — Business Spec

> Clean-room. Đợt **S5**.

## Features

1. **Optimistic concurrency**: `PATCH chapter` accepts optional `expectedUpdatedAt` (ISO string). If the stored `updatedAt` differs, respond **409** with message `chess.study.errors.chapterConflict`.
2. **Autosave (client)**: debounce ~1.5s after edits (tree/title/fields); show status idle | saving | saved | error | conflict.
3. **Manual save** still available; both send `expectedUpdatedAt`.
4. **No** full OT tree realtime / presence room in this pass (optional presence deferred).

## Technical

- Extend `updateChessStudyChapterBodySchema` with `expectedUpdatedAt?: string`.
- Repository update with WHERE id AND updatedAt when provided.
- Editor: useEffect debounce + status badge.
