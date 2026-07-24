# Chess Engine (Arasan) Business Spec

## Business Overview

Learners and teachers can **play against a computer** and **analyze positions** on covuahocduong.com. The preferred engine is **Arasan** (MIT License). If the Arasan binary is not installed, the platform falls back to a built-in MIT minimax suitable for school demos.

## Who Uses It

- Students practice full games against the machine (easy / medium / hard).
- Teachers demonstrate ideas on the analysis board (eval + principal variation).

## Feature Functions

- Play page: choose color and difficulty; human moves on the board; engine replies.
- Analysis page: load FEN, walk moves, request analysis (score / mate / PV).
- Engine status: reports whether Arasan is configured and available.

## Engine Policy

| Engine              | License       | Role                                          |
| ------------------- | ------------- | --------------------------------------------- |
| Arasan (UCI binary) | MIT           | Preferred production engine via `ARASAN_PATH` |
| Builtin minimax     | MIT (in-repo) | Fallback when Arasan is missing               |
| Stockfish           | GPL           | **Not used**                                  |

## Key Technical Context

- API: `POST /api/chess/engine/bestmove`, `POST /api/chess/engine/analyze`, `GET /api/chess/engine/status`
- Implementation: `apps/api/src/chess/engine/`
- Web: `/chess/play`, `/chess/analysis`
- Permissions: `chess.exercise.read` or `chess.game.read`

## Ops

1. Download/build Arasan from https://arasanchess.org or https://github.com/jdart1/arasan-chess
2. Set `ARASAN_PATH` to the UCI executable (e.g. `arasanx-64` / Windows build).
3. Restart API. Status endpoint should show `defaultEngine: "arasan"`.

## Non-Goals

- Browser WASM build of Arasan (optional future).
- Online multiplayer.
- Tournament Elo ratings.
