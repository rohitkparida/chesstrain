## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: none

---

# Magnus Engine � Agent Baseline

Adaptive chess training system. Read this before touching any code.

---

## What It Is

A web app that trains chess players using spaced repetition, adaptive difficulty, and six distinct training modules. The core loop: serve a problem slightly above the user's level ? score it ? update their weakness profile ? schedule return via SRS.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **SvelteKit** | Smallest compiled output, built-in reactivity, no Zustand needed |
| Chess rules | **chess.js** | Framework-agnostic, battle-tested |
| Board rendering | **chessground** | Framework-agnostic DOM library, use directly (no wrapper) |
| Engine | **Stockfish WASM** | Runs in-browser, no server needed |
| Database | **Supabase** | Postgres + Auth + Realtime, hosted |
| SRS | **Custom SM-2** | Stored in Supabase, per-category Elo ratings |
| PGN | **pgn-parser** | Import user games |
| Voice | **Web Speech API** | Transcription during calculation mode |

---

## Key Decisions (Do Not Revisit Without Good Reason)

- **No SSR.** This is a pure SPA. No server components, no SSR routes.
- **No state library.** Svelte stores replace Zustand. Keep state local unless truly global.
- **Engine runs client-side.** Stockfish WASM only. No server-side analysis.
- **Chessground used directly.** No Svelte wrapper � mount it in `onMount`, destroy in `onDestroy`.
- **CSS is scoped per-component.** No global utility classes. No Tailwind.

---

## Six Training Modules

1. **Pattern Recognition** � Click-to-move, timed, 40+ taxonomy tags
2. **Calculation** � Notation input, tree diff visualizer, 4 sub-modes
3. **Positional Understanding** � Evaluation / Guess the Move / Imbalance ID / Plan Ranking
4. **Endgame Technique** � Play vs perfect engine, technique score, gated progression
5. **Opening Preparation** � Repertoire tree, move trainer, deviation scramble, game import
6. **Decision-Making** � Process checklist overlay, full games, blunder trap, resilience mode

---

## Adaptive Engine (Core Logic)

- Every puzzle has an Elo rating. User has an Elo per skill x sub-type.
- Queue serves `user_elo + 50-100` in weakest categories.
- Weakness stalker drills narrower sub-types until root cause found.
- Forgetting curve: per-pattern learning rate ? dynamic retention intervals.
- Cognitive load monitor: accuracy drop over session time ? auto-shift to lower intensity.

---

## DB Tables (Key)

```
users, profiles
puzzles (id, elo, tags[], pgn, solution)
user_puzzle_history (user_id, puzzle_id, result, time_ms, scheduled_at)
user_skill_ratings (user_id, skill, sub_type, elo)
openings (eco, moves, concept)
user_opening_tree (user_id, fen, correct_move, last_seen)
games (user_id, pgn, source, analyzed)
sessions (user_id, type, started_at, ended_at)
session_events (session_id, module, puzzle_id, result)
```

---

## Puzzle Data Sources

- Lichess open puzzle DB (~4M puzzles, tagged, rated)
- Syzygy tablebases for endgame positions
- GM game PGN corpus for Guess-the-Move / The Mirror

---

## File Structure (Target)

```
src/
  lib/
    chess/        # chess.js, chessground init, Stockfish worker
    srs/          # SM-2 scheduler, Elo delta math
    db/           # Supabase client, typed queries
    modules/      # One folder per training module
  routes/
    /             # Dashboard + daily brief
    /train/[module]
    /openings
    /games        # Import + review
  stores/         # Svelte stores (session, profile, queue)
  components/     # Shared UI (ChessBoard, Timer, FeedbackFlash)
```

---

## Code Rules

- Components stay under ~150 lines. Split if larger.
- No `any` types � TypeScript strict mode on.
- Every Supabase query goes through `src/lib/db/` � no raw fetch calls in components.
- Stockfish runs in a Web Worker. Never block the main thread.
- All SRS logic lives in `src/lib/srs/` � pure functions, fully testable.
