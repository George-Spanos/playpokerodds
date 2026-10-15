## Context

The oak service is ~60 lines: parse body → `validateRound` (poker-core) → `calculateOdds(round, iterations)` → `{ odds }`. All the behavior lives in `src/core`'s engine:

- `Calculator.simulate()`: if `calculateMaxIterations(input) < input.iterations` (small enough to be exact) it enumerates every 1–2-card board completion (ordered pairs, so turn+river order double-counts — harmless for equity); otherwise Monte Carlo over `iterations` shuffled games.
- `Game`: deck in fixed low→high order, shuffle (Fisher-Yates), remove known board/hand cards, deal NPCs, evaluate all players, **shuffle players, then sort by compare()** — the shuffle-before-sort breaks tie-order bias deterministically. Ties: every tied player gets `tieCount++`; single winner gets `winCount++`.
- `evaluate()`: sort cards desc by rank then suit (two stable sorts), rank-count walk in descending rank order tracking straight runs (top of run), flush suit (≥5), then category cascade: straight-flush (incl. wheel-with-ace-in-flush), quads, full house (two-trip case uses second trip as pair), flush, straight (incl. wheel), trips, two pair, pair, high card. Kickers come from the sorted 7-card list sliced after category cards.
- Odds extraction: `results[myHand].winPercent` → `parseFloat(toFixed(2))`.

The web-api (Rust) calls this service over HTTP with `x-api-key`; the UI drives it via web-api only.

## Goals / Non-Goals

**Goals:**
- One stack: Rust service replacing the Deno-runtime-pinned container.
- Exact behavioral parity with the TS engine (same winners, same tie handling, same exhaustive/sampled split, ±1pp on statistics, exact match on exhaustive cases).
- Kill `src/core` + dnt vendoring (no remaining consumers after this port).

**Non-Goals:**
- Performance re-architecture (no rayon/threads beyond what parity allows; the 50k-iteration default must simply stay responsive).
- API changes (no new endpoints, no request fields beyond what oak accepted).

## Decisions

### D1: `src/calc-odds-api` becomes a second Rust crate (workspace member)
Standalone axum binary crate `ppo-calc-odds-api`; shares the repo's Docker/CI patterns with web-api. No workspace-level refactor needed: two independent crates, two Dockerfiles.
*Alternative*: merge into web-api as a library call (no HTTP hop). Rejected: changes the deployment topology and the web-api↔calc contract the user asked to keep; the service boundary is the point of the separate CPU-heavy deployment.

### D2: Hand evaluation as pure functions over u8-backed card vectors
Card = `(rank: u8 2..=14, suit: u8 1..=4)`; evaluate returns `(category: u8, tiebreaks: [u8; 5])` — comparison via lexicographic tiebreak tuple instead of sorted-card-list comparison (same winners, cheaper). Category cascade ported 1:1 from the TS walk (descending rank count scan, straight-run tracking, flush detection, wheel handling).
*Alternative*: a bit-mask evaluator (7462-entry lookup). Faster, but higher risk of behavioral drift from the TS engine in tie/kicker corners; parity is the requirement, raw speed is not (50k iterations of 7-card eval is already subsecond in naive Rust).

### D3: Simulation loop mirrors Game.play() exactly
Per iteration: build deck (fixed order), remove known cards, Fisher-Yates shuffle via `rand`, deal board completion + NPC hands, evaluate, shuffle players, sort by `(category, tiebreaks)` desc, count winner/ties. Exhaustive path: ordered-pair enumeration like `createBoardScenarions` (turn+river ordered pairs — preserves the TS double-counting, harmless to odds).
*Alternative*: fix the tie-bias (compare without pre-shuffle). Rejected: changes statistical output by a hair; parity wins.

### D4: Validation ported from web-api's domain module (duplicated, not shared)
The round validation rules (2-card hands, `'..'` hands, board sizes, uniqueness) are ~80 lines; copy into the calc crate rather than inventing a shared crate for one module. The web-api's copy stays authoritative for its own contract tests.
*Alternative*: shared workspace crate `ppo-domain`. Rejected: cross-crate coupling for one module; the two services deploy and version independently.

### D5: `src/core` removal
After this port nothing consumes `src/core` (web-api dropped it in the previous migration, the UI has its own JS subset, calc-odds now native). Remove the crate, its dnt build script, the `core-vendor` workflow, and the vendored copies under `src/ui` (web-api's was already removed). Keep `LICENCE`/`README` history in git.
*Alternative*: keep core as reference. Rejected: dead code; git history preserves it.

## Risks / Trade-offs

- [Evaluator corner-case drift (kicker order, wheel straight-flush, two-trip full houses)] → Port the TS test suite 1:1 as Rust unit tests plus property tests: for 10k random 7-card sets, TS (via a fixture script) and Rust must agree on category + tiebreaks; differential testing catches drift mechanically.
- [Tie statistics differ if player-shuffle is skipped] → The pre-compare shuffle is load-bearing (TS comment says so); port it verbatim and seed-independent (rand::thread_rng).
- [Exhaustive path blow-up for unusual inputs] → Same guard as TS: exhaustive only when `calculateMaxIterations < iterations`; ordered-pair enumeration for exactly-2 remaining cards, single loop for 1.
- [Iterations env semantics] → oak read `ITERATIONS` at startup with 50k default and ignored invalid values with a console error; port that exact behavior.

## Migration Plan

1. Build the crate with the engine ported + unit tests green (parity fixtures + core-suite matchups).
2. Swap the HTTP layer (axum), port the Dockerfile to rust:alpine multi-stage, update compose build context.
3. Differential-verify against the running Deno service before cutover: same requests, ±0 tolerance on exact cases.
4. Remove `src/core`, the vendored copies, `deno.json`s, and the core CI workflow; update README/AGENTS.md.

Rollback: compose build context revert; the Deno service's last image is still in the registry.

## Open Questions

None.
