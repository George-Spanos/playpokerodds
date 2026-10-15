# Repository Guidelines

## Project Structure & Module Organization
This is a polyglot monorepo for Play Poker Odds:
- `src/ui` — Angular 17 client and static card/UI assets.
- `src/web-api` — Express TypeScript API, Prisma schema/migrations, and Jest tests.
- `src/core` — Deno poker domain logic.
- `src/calc-odds-api` — Dedicated Deno odds-calculation service.
- `.github/workflows` — Service build/test/publish pipelines.
- `openspec` — Specification changes and archived specs.

## Build, Test, and Development Commands
Use repository-root Docker commands unless working in one service:
- `./run.sh` — Build and start the full local stack.
- `docker compose down` — Stop local services.
- `cd src/web-api && npm run dev` — Run the API locally.
- `cd src/ui && npm run dev` — Run the Angular client locally.
- `cd src/calc-odds-api && deno task dev` — Run the odds service locally.

From `src/web-api`, use `npm run build`, `npm run lint`, and `npm test` or `npm run docker:test`. From `src/ui`, use `npm run build` and `npm test`. From `src/core`, use `deno task test` and, after source changes, `deno task build:npm`; commit regenerated `vendor/poker-core` folders.

## Coding Style & Naming Conventions
Use two-space indentation, UTF-8, single quotes for TypeScript, and a final newline. The web API uses ESLint plus Prettier (`npm run lint:fix`). Keep Angular filenames such as `leaderboards.component.ts` and route/store/service names consistent with existing feature folders. For Deno, prefer idiomatic ESM and the existing `@poker-core/` import mapping.

## Testing Guidelines
Core uses Deno tests named `*.test.ts`; the web API uses Jest functional tests in `tests/functional/*.spec.ts`; the UI uses Jasmine/Karma specs. Add focused tests with each behavior change. Run the relevant service test suite before opening a PR; API tests collect coverage automatically.

## Commit & Pull Request Guidelines
History uses short lowercase imperative subjects such as `fix button styles` and `bring CI in line with the locally-built core`. Keep commits similarly focused. PRs should include intent, linked issues, test evidence, and UI screenshots when applicable. Verify CI-sensitive changes to CI, workflows, or core vendoring.

## Security & Configuration Tips
Never commit secrets. Copy `.env.example` when adding API configuration, and ensure Prisma migrations and environment examples remain reproducible.
