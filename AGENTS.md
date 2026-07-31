# Magnus Engine Agent Guide

Read this file before changing code. Magnus Engine is an adaptive chess-training
SPA built with SvelteKit, TypeScript, chess.js, browser Stockfish, Supabase-ready
repositories, and Vitest.

## Product Model

The learning loop is:

```text
choose exercise -> commit answer -> receive feedback -> record attempt -> schedule review
```

Current training modules are Board Vision, Tactics, Calculation, Positional,
Decision, Openings, Endgame, and My Mistakes. Today is finite; unlocked Train
modules are repeatable. Guest mode keeps all modules available.

Core product rules:

- Spoonfeed the workflow, not the answer.
- Keep instructions short and highlight only the decisive words.
- Preserve useful struggle, but remove ambiguity about what action is expected.
- Do not reveal exact answers before commitment.
- Show the answer after an incorrect committed attempt or Give up.
- Skip does not count as a failed attempt. Give up records solution assistance.
- Mastery uses unassisted attempts only.
- Persist progress and preferences per account. Never leak state across accounts.

## Architecture

- The app is a static SPA. Do not add SSR-only behavior or server components.
- Use Svelte stores for global client state. Do not add another state library.
- Keep chess rules in pure TypeScript modules and verify legality with chess.js.
- Stockfish runs in a Web Worker. Never block the main thread.
- Supabase access belongs behind `src/lib/db/` or repository interfaces.
- SRS, scoring, mastery, queueing, and difficulty logic stay outside components.
- CSS is scoped per component. Use the existing global design tokens.

### Exercise Platform

The exercise platform uses universal orchestration with targeted interactions:

- `src/lib/drills/`: definitions, registry, runner, and contracts.
- `src/components/drills/`: interaction adapters and shared runner UI.
- Domain solvers remain in their learning or chess modules.

Universal behavior includes loading, active/evaluating/feedback states, timing,
attempt recording, assistance, persistence, SRS metadata, Skip, Give up, and
Continue. Interaction adapters own only how an answer is collected.

Rules for extending it:

- Add adapters only when a real migrated exercise requires a new interaction.
- Never add drill-ID conditionals to the runner.
- Never inspect drill-specific private-data fields in the runner.
- Keep generated instances JSON-serializable and versioned.
- Pass only public data to interaction components; answers stay private.
- Keep registry entries lightweight and lazy-load drill implementations.
- Keep answer reveal owned by the drill definition.
- Suppress stale generation, evaluation, engine, and worker callbacks.
- A standard drill should require one solver, one definition, one registry entry,
  and focused tests. It should not require runner or route changes.
- Do not call a module "migrated" until its live route uses the new platform with
  behavioral parity.

Board Vision currently establishes the square-tap and square-select patterns.
The Tactics registry entry is a prototype until it preserves the live route's
complete-line workflow, automatic opponent replies, scoring, and feedback.

## Scope Discipline

- Read the current implementation and tests before editing.
- Run `git status --short` first. Existing changes belong to the user.
- Never revert, overwrite, stage, or reformat unrelated changes.
- Architecture work must preserve routes, UI, copy, layout, and behavior unless
  the request explicitly includes a redesign.
- Do not replace an existing component with a new visual design while refactoring
  its internals.
- Do not add duplicate titles, instructions, controls, metrics, or navigation.
- Do not create speculative abstractions, adapters, content banks, or settings.
- Keep edits within the requested subsystem. Note unrelated problems instead of
  quietly fixing them.

Before finishing, inspect the complete diff. Look specifically for unexpected
UI churn, deleted tests, hardcoded styling, increased component size, and files
outside the requested scope.

## TypeScript Rules

- Strict TypeScript is required.
- Do not use `any`, `as any`, `Component<any>`, `unknown as T`, or `as never` to
  silence an incompatible design.
- Use discriminated unions, mapped interaction contracts, typed factories, and
  runtime narrowing at heterogeneous boundaries.
- Do not create one giant type with optional fields for every interaction.
- Parse external data as `unknown`, validate it, then narrow it.
- Keep response, public data, and private data connected by the interaction type.
- Use structured APIs rather than parsing chess notation or stored data manually.

## Chess Correctness

- Use chess.js for legal moves, SAN parsing, UCI normalization, check, mate,
  stalemate, draw, promotion, castling, and terminal states.
- Never compare SAN directly with UCI.
- Do not approximate legal king moves with a static attack map.
- A prompt saying "adjacent king squares" must exclude castling.
- Keep canonical square identity independent of orientation and rotation.
- Board flipping or 90/270-degree rotation must change presentation only, never
  the square reported by a click.
- Handle promotion explicitly in move responses.
- Preserve complete tactical lines and automatic opponent replies when migrating
  Tactics; matching only the first move is not behavioral parity.

## Svelte And UI Rules

- Keep components near 150 lines. Split state, picker, metrics, or controls when a
  component grows materially beyond that.
- Unsubscribe stores and cancel timers, workers, engines, and async generations
  during teardown.
- Reactive props must remain reactive; do not capture only their initial values.
- Use `TrainingModuleShell` once per exercise. Do not duplicate its Skip, Reset,
  task, source, or feedback controls.
- Follow `task -> commit -> feedback -> continue`.
- Use one centered content width through `--content-width`.
- Use `--training-board-size` for full training boards.
- Keep layouts flat. Avoid cards inside cards and decorative empty containers.
- Keep screens quiet by default; reveal secondary explanations progressively.
- Use concise chess terminology. Glossary support explains unfamiliar terms.
- Use SVG for icons and directional controls, not emoji or text-arrow substitutes.
- Use CSS tokens without hardcoded fallback colors. Chess-square and piece colors
  are the intentional exception.
- Do not add board shadows.
- Preserve touch, keyboard, and screen-reader behavior.

Board Vision invariants:

- Users may select one or several drill types; at least one remains active.
- The selected mix persists per account and reloads on account change.
- Name the Square supports white, black, 90-degree, and 270-degree views.
- Canonical clicks remain correct in every orientation.
- Multi-select drills use an explicit None action; do not provide a second empty
  submission path.
- None-answer rounds target approximately 15 percent.
- Incorrect feedback reveals every missed and extra square clearly.

## Testing Rules

Tests are product contracts, not obstacles:

- Never delete, weaken, skip, or rewrite a regression test merely to make a refactor
  pass.
- When behavior intentionally changes, replace old coverage with equal or stronger
  coverage and explain why.
- Parameterized tests count as multiple scenarios. Do not silently replace them
  with one shallow assertion.
- A button-label change is not proof that the board itself changed orientation.
- Test observable behavior, persistence, account isolation, and late callbacks.

Required regression coverage for the drill platform:

- Canonical square clicks in white, black, 90-degree, and 270-degree views.
- Single-selected-drill Continue and Skip.
- No immediate drill repetition when alternatives exist.
- Account switch and refresh persistence.
- Skip versus Give up attempt semantics.
- Assisted attempts excluded from mastery.
- Correct visual answer reveal.
- Stale generation and stale evaluation suppression.
- Lazy-load and generation failures produce a retryable error.
- SAN-to-UCI normalization, promotion, castling, and complete tactical lines.
- Generated FEN validity, score bounds, stable fingerprints, and no public answer
  leakage.

## Verification And Reporting

For normal code changes, run:

```text
npm run check
npm test
npm run build
```

Also manually exercise the affected route when interaction or layout changed.
Check light and dark themes, narrow layouts, keyboard use, and horizontal overflow
when relevant.

Report exact results only from commands run against the current worktree:

- Distinguish errors from warnings.
- Do not claim persistence, code splitting, route migration, or behavioral parity
  from compilation alone.
- Do not call deferred work resolved.
- Do not call a registry entry a migrated feature when no live route uses it.
- If test totals decrease, identify every removed scenario and justify it.
- State what was not tested.

Completion requires a clean relevant diff, preserved regression coverage, no
known behavioral regression, and truthful verification. Passing tests alone is
not sufficient.
