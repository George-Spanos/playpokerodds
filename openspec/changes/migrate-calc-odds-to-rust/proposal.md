## Why

`src/calc-odds-api` is the last Deno service in the repo — a single oak endpoint pinned to `denoland/deno:1.41.0` because oak v14 misdetects Deno 2. The CPU-critical Monte Carlo simulation it wraps is pure synchronous computation, ideal for Rust: the same 50k iterations run in a tight native loop with no GC, and the service drops the Deno runtime pin entirely.

## What Changes

- **BREAKING** (repo-internal): `src/calc-odds-api` is rewritten from oak (Deno) to Rust (axum), joining the web-api's stack. The HTTP contract is preserved exactly: `POST /api/calcOdds` → `{ odds }`, `GET /liveness`, `x-api-key`/`APIKEY` gating (403 on mismatch, open when unset), `PORT` env, 400 on unparseable body / invalid round.
- The full poker evaluation engine is ported to Rust with behavioral parity to `src/core`: rank/suit enums, 9-category hand evaluator (with straight-flush and wheel handling, ace-low), 7-card evaluation, exhaustive enumeration when the exact solution is small enough (≤2 board cards to come), and Monte Carlo simulation otherwise (deck shuffle, known-card removal, shuffle-before-compare tie handling).
- `src/core`'s odds engine is no longer consumed by any runtime service; `src/core` and its dnt vendoring become dead weight (removal included).
- CI: the Deno workflow is replaced by a Rust workflow (build + test).

## Capabilities

### New Capabilities
- `calc-odds-service`: The Rust odds-calculation service: HTTP contract, evaluation engine parity, and simulation behavior.
