# Repository Guidelines

## Project Structure & Module Organization
This is a polyglot monorepo for Play Poker Odds:
- `src/ui` — Vanilla JS client (ES modules + CSS, no framework) and static card/UI assets. Entry: `index.html`; app code in `src/js/`; styles in `src/styles/`.
- `src/web-api` — Rust API (axum + sqlx) with the in-process Monte Carlo odds engine (`src/odds/`: hand evaluator in `evaluate.rs`, simulation in `simulate.rs`). Routes in `src/routes`, SQL migrations in `migrations/`, integration tests in `tests/integration.rs`.
- `.github/workflows` — Service build/test/publish pipelines.
- `openspec` — Specification changes and archived specs.

## Build, Test, and Development Commands
Use repository-root Docker commands unless working in one service:
- `./run.sh` — Build and start the full local stack.
- `docker compose down` — Stop local services.
- `cd src/web-api && cargo run` — Run the Rust API locally (needs `DB_CONNECTION_STRING`, `JWT_SECRET`, `CALC_ODDS_URL` env; copy `.env.example`).
- `cd src/web-api && cargo test` — Unit + integration tests (integration needs a Postgres; see `tests/integration.rs` header).
- `cd src/ui && npm run dev` — Serve the client on :4200 (SPA fallback dev server).
- `cd src/ui && npm test` — Vitest unit tests for client domain logic.

## Coding Style & Naming Conventions
Two-space indentation, UTF-8, single quotes for TypeScript, final newline. Rust: standard `cargo fmt` style, modules mirror the old route tree (`routes/auth.rs`, `routes/poker.rs`, `routes/user.rs`, `routes/health.rs`). Vanilla JS: ES modules, one surface per file under `src/js/surfaces/`, pure logic in `src/js/domain/`, DOM helpers in `src/js/components/`. The client design system is chalk-on-slate; tokens live in `src/styles/tokens.css` and shared chalk material in `chalk.css` — do not inline colors.

## Testing Guidelines
Rust: unit tests live beside the code (`cargo test --lib`); the endpoint contract suite is `tests/integration.rs` (needs `TEST_DATABASE_URL` and runs serially: `cargo test --test integration -- --test-threads=1`). Client: Vitest specs beside the domain module (`src/js/domain/poker.test.js`). UI behavior is verified in the browser (play loop, auth, favorites, deep links). Add focused tests with each behavior change.

## Commit & Pull Request Guidelines
History uses short lowercase imperative subjects such as `fix button styles` and `bring CI in line with the locally-built core`. Keep commits similarly focused. PRs should include intent, linked issues, test evidence, and UI screenshots when applicable. Verify CI-sensitive changes to CI, workflows, or core vendoring.

## Security & Configuration Tips
Never commit secrets. Copy `.env.example` when adding API configuration. The Rust API reads `DB_CONNECTION_STRING`, `JWT_SECRET`, `CALC_ODDS_URL`, `CALC_ODDS_KEY`, `LEADERBOARD_MIN_GAMES`. Database schema is baselined in `src/web-api/migrations/0001_baseline.sql` and applied idempotently at startup.
