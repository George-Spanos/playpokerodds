## Why

The repo runs three Deno footprints — `src/core` (domain logic + dnt npm build), `src/calc-odds-api` (oak service pinned to Deno 1.41 because oak v14 breaks on Deno 2), and the Deno-flavored CI workflow that builds and vendors `poker-core`. Maintaining a Deno runtime and its dnt transpile pipeline for a single small package is ongoing overhead (runtime pinning, lockfile format drift, a vendored-build freshness gate in CI). The rest of the repo (web-api, ui) is already Node + TypeScript, so consolidating on Node removes the second toolchain entirely.

## What Changes

- **BREAKING** (repo-internal): `src/core` becomes a Node/TypeScript package built with `tsc` instead of `deno task build:npm` (dnt). Consumers keep the `file:./vendor/poker-core` install; the vendored output becomes plain `tsc` output.
- `src/core` tests move from `Deno.test` + `std/assert` to Vitest.
- `src/calc-odds-api` is rewritten from oak (Deno) to Express (Node + TypeScript), matching web-api conventions; drops the Deno 1.41 runtime pin and its lockfile rationale.
- CI: `core-vendor.yml` swaps `denoland/setup-deno` + dnt for Node + `tsc`; the stale-vendor check is kept.
- Dockerfiles for `core`-derived images (`calc-odds-api`) build on `node:*` instead of `denoland/deno:1.41.0`.
- `run.sh`, `AGENTS.md`, and repo docs drop Deno commands in favor of npm scripts.
- Dev tooling: Node-based scripts replace `scripts/build_npm.ts` (dnt) for vendoring.

## Capabilities

### New Capabilities
- `poker-core-build`: Building, testing, and vendoring the `poker-core` package from `src/core` using Node tooling (tsc build, Vitest tests, vendor distribution to consumers).

### Modified Capabilities
- None at spec level. `calc-odds-api`'s external contract (POST `/api/calcOdds`, GET `/liveness`, `x-api-key` gating, `ITERATIONS` env) is preserved exactly — only the framework/runtime underneath changes, which is a design concern, not a requirement change. No specs exist yet in `openspec/specs/` for any capability, so there are no existing requirement documents to modify.
