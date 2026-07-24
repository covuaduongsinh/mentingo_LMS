# Chess Game Bank Business Spec

## Business Overview

The Chess Game Bank stores annotated **PGN games** for teaching: model games, story games, opening illustrations, and endgame studies. Teachers embed games in lessons; learners step through moves with a MIT board viewer.

## Who Uses It

- Teachers and content creators upload or paste PGN with teaching notes.
- Students view published games inside courses or a game library.
- Pedagogy track uses teaching notes without exposing them to students when redacted.

## Feature Functions

- CRUD games: title, PGN, topics, level, teaching notes, tags, published flag
- Filter by topic, level, search, published
- Topics reuse `CHESS_TOPICS` (opening, story, strategy, …)

## Key Technical Context

- API: `apps/api/src/chess` (`/chess/games`)
- Schema: `chess_games`
- Frontend viewer: `apps/web/app/modules/Chess/board/PgnViewer.tsx` (chess.js MIT)
- Permissions: `chess.game.read`, `chess.game.manage`

## Non-Goals

- Online multiplayer
- Engine analysis (deferred under MIT-only policy)
