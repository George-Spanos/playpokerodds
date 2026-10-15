## 1. Engine port

- [ ] 1.1 Create `src/calc-odds-api` Rust crate (axum, tokio, serde, rand; `cargo build` clean); port Card/Rank/Suit as u8-backed types
- [ ] 1.2 Port the evaluator (`evaluate.ts`): descending rank-count walk, straight-run tracking, flush detection, category cascade (straight-flush incl. wheel, quads, full-house two-trip case, flush, straight incl. wheel, trips, two pair, pair, high card) with `(category, tiebreaks)` output; unit tests from core's fixtures + corner cases (wheel straight-flush, two-trip full house, kicker chains)
- [ ] 1.3 Port Game/Calculator: fixed-order deck, Fisher-Yates, known-card removal, NPC dealing, exhaustive ordered-pair path when `maxIterations < iterations`, Monte Carlo loop with shuffle-before-compare tie handling, winPercent rounding parity; unit tests for exhaustive exactness and the core suite matchups (±1pp)

## 2. Service + deployment

- [ ] 2.1 Axum service: POST /api/calcOdds (round validation 400s, ITERATIONS env with 50k default + console warning), GET /liveness, x-api-key gating 403/open, PORT env; Dockerfile on rust:alpine → small runtime image; compose context unchanged
- [ ] 2.2 Differential test against the Deno service before cutover: same requests to both engines, exact odds match on exhaustive cases, ±1pp on sampled
- [ ] 2.3 Compose + CI swap: `docker compose build calc-odds-api` on the new image; replace the Deno CI workflow with a Rust one; full-stack smoke through the UI play loop

## 3. Core removal

- [ ] 3.1 Delete `src/core` (incl. dnt script), `src/ui/vendor/poker-core`, deno configs; prune README's core/vendor sections; verify `grep -ri "poker-core\|deno task" README.md AGENTS.md` is clean and no consumer references remain
- [ ] 3.2 Final `./run.sh` smoke: deal → guess → reveal works end-to-end through the Rust calc service
