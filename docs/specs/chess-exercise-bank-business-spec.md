# Chess Exercise Bank Business Spec

## Business Overview

The Chess Exercise Bank is a reusable library of practice and assessment items for **Cờ Vua Học Đường**. Items cover more than tactics: openings, middlegame, endgame, strategy, rules, tournament rules, stories, competitive psychology, student psychology, and pedagogy.

Authors (teachers / content creators) create items once and attach them to quiz lessons or assign them in a practice hub. Learners solve published items and receive correctness feedback.

## Who Uses It

- Content creators and teachers manage exercises (create, filter, publish).
- Students solve published exercises in courses (quiz question types) or practice flows.
- Coaches use pedagogy / psychology tagged items for teacher-track programs.

## Feature Functions

- CRUD exercises with title, audience (`student` | `teacher` | `both`), topics, difficulty, format, FEN, solution, explanation.
- Filter by topic, audience, format, difficulty, search, published state.
- Record attempt results for published exercises.
- Taxonomy topics from shared `CHESS_TOPICS` constants.

## Formats

- `chess_find_best` / `chess_move_line` — board moves in UCI
- `single_choice`, `true_false`, `brief_response` — knowledge items without board

## Key Technical Context

- API: `apps/api/src/chess` (`GET/POST /chess/exercises`, attempts)
- Schema: `chess_exercises`, `chess_exercise_attempts`
- Permissions: `chess.exercise.read`, `chess.exercise.manage`
- License policy: MIT-only board/logic libraries; Lichess puzzle **data** may be imported as CC0 later

## Non-Goals (current phase)

- Stockfish / GPL engines
- Multiplayer play
