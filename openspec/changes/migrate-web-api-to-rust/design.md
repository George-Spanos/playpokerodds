## Context

See proposal.md. Codebase facts that shape the design:

- The Angular client is 5 views (play, leaderboards, about, auth, profile) with two stores (auth, play), an interceptor-based API client, and heavy component nesting (`user/ui/**` alone has 10 components). The actual state is small: current round, current answer, auth user, leaderboards list, profile data.
- The web API is a thin CRUD+auth service: 17 endpoints, 6 tables, JWT HS256 (jsonwebtoken, 4d expiry, claims `userId`/`email`/`role`), bcrypt passwords, two raw-SQL reports (leaderboards-adjacent profile query, favorites list), and one outbound HTTP call (calc-odds). No websockets, no queues, no file handling.
- Prisma is used both as ORM and as migration tool. Only one raw `$queryRaw` is performance-relevant (`countUniqueRoundsPlayed`); the rest is single-table or small-join access.
- Postgres 16.3 in compose; existing migrations under `src/web-api/prisma/migrations` created the schema in deployed environments.
- calc-odds-api (Deno/oak) is NOT in scope; its contract (`POST /api/calcOdds` → `{odds}`) is a given.

## Goals / Non-Goals

**Goals:**
- UI: replace Angular with static ES modules while shipping the approved redesign; keep all capabilities and the API contract; kill the vendored poker-core dependency in the client.
- API: replace Express/Prisma with one Rust binary preserving the contract bit-for-bit where clients can observe it.
- Both: keep Docker/compose workflow and CI shape; keep env contract stable.

**Non-Goals:**
- Changing the calc-odds-api service or poker-core (both stay as-is for now).
- New features on either side (no new endpoints, no new UI capabilities).
- SSR/SEO work for the client (game behind auth-agnostic play loop; current app is CSR-only).

## Decisions

### UI

#### D1: No build step — native ES modules served statically
The app is 5 views of plain DOM + fetch. ES modules with bare imports work natively; the "build" is copying files. Dockerfile becomes `FROM nginx:alpine` + `COPY`. A dev server is `npx serve` or any static server; no webpack/vite/rollup.
*Alternative*: Vite for dev ergonomics (HMR, TS). Rejected: TS is not required by the user's "vanilla js" target; HMR is irrelevant for an app this size; zero-tooling is the point of the migration.

#### D2: Hand-rolled router + tiny store pattern
A hash-less History-API router (~60 lines: route table, param matching, outlet render) and a per-surface state holder via plain modules + `CustomEvent`/observer updates. No reactive framework needed at this scale.
*Alternative*: lit-html or hiring a micro-framework. Rejected: adds a dependency for no capability; the redesign owns the DOM structure anyway.

#### D3: Domain logic re-implemented as a small `src/ui/src/domain/` ES module
`createRoundInputs`, board-state map, `calculateGuessScore` (2-dp `|e−o|`), round payload validation — ported from core semantics with unit tests in Vitest (jsdom-free, pure functions). Card rendering uses the existing SVG assets.
*Alternative*: keep importing vendored poker-core. Rejected by scope (framework-free client, no vendored package); the needed surface is ~80 lines.

#### D4: Redesign is CSS-first with a token system
`.impeccable/surfaces/src-ui.md` owns the direction. Implementation: `src/ui/src/styles/tokens.css` (palette, chalk textures via authored SVG/CSS, type scale) + per-surface stylesheets; card faces (53 SVGs) kept as-is — they are the only full-color objects by contract.
*Alternative*: keep old stylesheets and re-skin. Rejected: full redesign approved; old look is anti-reference.

### API

#### D5: axum + sqlx + tokio; single crate
axum 0.7 for the router/middleware/extractors; sqlx (postgres, runtime-tokio) for compile-time-checked queries; `jsonwebtoken` crate (HS256, same claims); `argon2` + `bcrypt` crates for the hash migration; `reqwest` for the calc-odds call. One binary crate, modules mirroring the existing route tree (`routes/auth.rs`, `routes/poker.rs`, `routes/user.rs`, `routes/health.rs`).
*Alternative*: actix-web — equivalent capability, no decisive advantage; axum's extractors map 1:1 to the middleware-chain patterns being ported. *Alternative*: keep Prisma via a Node sidecar — defeats the migration.

#### D6: Migration baseline = generated SQL from Prisma schema
A single new sqlx migration (`0001_baseline.sql`) declaring the exact current tables/columns/indexes (generated from `prisma migrate diff` against a fresh DB), marked as applied via a `_sqlx_migrations` table. Existing Prisma-managed DBs: sqlx ignores `_prisma_migrations` and validates the schema matches. No data migration needed (same tables).
*Alternative*: re-create schema from scratch — risks drift from deployed DBs. Rejected: baseline diff is mechanical and verifiable.

#### D7: Error/status mapping ported literally
Each endpoint's status codes and error strings (e.g. `3301: calc odds url not set`, 401 on missing/invalid token, 400 on validator failures, 404 round-not-found) are ported verbatim; the Jest functional suite's assertions become Rust integration tests (axum's `tower::ServiceExt::oneshot` + a test Postgres from compose).

#### D8: bcrypt → argon2id transparent upgrade
Login verifies bcrypt first (legacy), then argon2id (current). On successful bcrypt verification the hash is re-written as argon2id. New registrations/updates always argon2id (cost: argon2id v19, 64MB, t=3 — OWASP baseline).

## Risks / Trade-offs

- [Decimal precision drift (Prisma Decimal ↔ Rust f64/Decimal)] → Store/load `NUMERIC(5,2)`/`NUMERIC(10,2)` as `rust_decimal::Decimal`; round at the same points the TS code does (`.toFixed(2)`); contract tests pin 2-dp formatting.
- [JWT claim/subtle validation differences (e.g. expiry leeway)] → Pin `jsonwebtoken` crate validation to the same rules (HS256, exp enforced); cross-verify tokens minted by the old API still validate during transition via contract test.
- [Raw SQL reports regression (profile history query)] → Port the SQL nearly verbatim into the sqlx query; contract tests assert exact JSON shape and masking behavior.
- [UI: no framework → DOM code sprawl] → Strict module boundaries: `domain/` (pure logic), `api/` (fetch), `state/`, `components/` (DOM builders), `styles/`; each surface one module; Vitest covers domain/state only (DOM via browser smoke).
- [UI: losing Angular's guards (existing-game.guard)] → Re-implement as a route-level check in the router (fetch round by id; on 404 redirect home) — behavior preserved.
- [Rust build time in CI] → Multi-stage Docker with cargo-chef-style layer caching; `cargo test` runs against a compose Postgres.

## Migration Plan

Two independent changes, sequenced by risk:

1. **API first** (contract tests exist in Jest; Rust suite must pass the same assertions). Docker swap: `web-api` build context → Rust Dockerfile; compose/CI updated; calc-odds + UI untouched.
2. **UI second** (redesign + vanilla rebuild together, verified against the running Rust API).

Rollback: both are service-level swaps in compose; `git revert` + image re-tag restores.

## Open Questions

None.
