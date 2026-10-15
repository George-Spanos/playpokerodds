## Context

Three Deno touchpoints (see proposal.md - Why):

1. `src/core` — pure TypeScript domain code, tests use `Deno.test` + `std/assert` URL imports; `deno task build:npm` runs `scripts/build_npm.ts`, which uses `jsr:@deno/dnt` to emit ESM+CJS+d.ts into `./npm`, then copies the result into `src/ui/vendor/poker-core` and `src/web-api/vendor/poker-core`. Consumers install via `"@moby-it/poker-core": "file:./vendor/poker-core"`.
2. `src/calc-odds-api` — a single `main.ts` (~60 lines) using oak v14, pinned to `denoland/deno:1.41.0` because oak v14 misdetects Deno 2 as Node and binds loopback (see Dockerfile comment).
3. `.github/workflows/core-vendor.yml` — sets up Deno, runs `deno task test` / `build:npm`, and fails CI when vendored output is stale or consumer lockfiles disagree on the vendored version.

`src/web-api` is CommonJS (`"module": "commonjs"`); `src/ui` is ESM Angular. `src/core/src` uses `export enum` (4 sites) — Node/TS-safe under `isolatedModules: false`, but regular enums don't compose with `verbatimModuleSyntax`/`const`-enum-only configs. No repo tsconfig uses `verbatimModuleSyntax` today.

## Goals / Non-Goals

**Goals:**
- One toolchain: Node + TypeScript everywhere; no Deno binary needed to build, test, or run any service.
- Byte-for-byte compatible consumer experience: vendored package name, version, exports, and behavior unchanged.
- Preserve the CI stale-vendor guard and lockfile-version check.
- Preserve calc-odds-api's HTTP contract exactly.

**Non-Goals:**
- Changing the poker-core public API, versioning, or statistical behavior.
- Migrating web-api or ui (already Node).
- Publishing poker-core to a registry; vendoring stays.
- Refactoring calc-odds-api beyond the oak→Express port (no new endpoints, no auth model changes).

## Decisions

### D1: Replace dnt with plain `tsc` (dual tsconfig: ESM + CJS)
dnt existed to produce dual-format output from Deno-flavored source. Under Node the source is already valid TS; two `tsconfig` variants (`tsconfig.esm.json`, tsconfig.script.json` extending a base with `"module": NodeNext/CommonJS`) produce the same layout as today (`esm/`, `script/`), with `mod.d.ts` authored per format. A small Node script (`scripts/build.mjs`) replaces `build_npm.ts`: clean, `tsc` twice, copy LICENCE/README, assemble `package.json`, sync into the two consumer `vendor/` dirs.

*Alternative considered*: keep dnt via `npx @deno/dnt` — still needs Deno-isms (`Deno.copyFileSync`) and a Deno runtime in CI; defeats the purpose. *Alternative*: ESM-only output — would force web-api (CommonJS) to change module resolution; rejected as consumer-visible.

### D2: Vitest for core tests
`Deno.test` + `std/assert` map nearly 1:1 to Vitest (`it`/`expect`); `assertEquals`/`assertAlmostEquals` have direct Vitest equivalents (`toEqual`/`toBeCloseTo` with explicit digit handling). Vitest is already the modern default for Node TS, needs no `ts-node` config, and runs ESM sources natively.

*Alternative considered*: `node:test` + `assert` — zero new deps, but weaker TS ergonomics (needs loader or build-before-test) and worse diff output; Vitest's dev UX wins for a package with statistical tolerance tests.

### D3: calc-odds-api on Express + tsx, mirroring web-api
Same framework as web-api (Express 4, matching the repo's existing conventions), run via `tsx` in dev and a `tsc` build for Docker. The ~60-line oak app ports to one Express router: `ctx.throw(400)` → `res.status(400).json(...)`, oak middleware → Express middleware. This drops the Deno 1.41 pin and its lockfile rationale entirely.

*Alternative considered*: Fastify or plain `http` — new convention for no gain; the repo already standardizes on Express. *Alternative*: reuse web-api's nodemon setup — calc-odds-api needs no DB; keep it minimal.

### D4: Keep `file:./vendor` vendoring, drop the `deno.lock` staleness signal
The vendored-copy model stays (consumers keep working offline, no registry publish). CI's stale-vendor check switches its rebuild command from `deno task build:npm` to `npm run build` and compares the same paths; `src/core/deno.lock` disappears, so the check's path list drops it. Consumer lockfile-version check is unchanged.

### D5: Docker images move to `node:22-alpine` (or matching web-api's Node version)
calc-odds-api's Dockerfile builds with `npm ci` + `tsc` and runs `node dist/main.js`. The core-derived copy steps (`COPY core ./core`) shrink to copying only what the build needs. No multi-arch or distro changes.

## Risks / Trade-offs

- [dnt output differs subtly from tsc output (e.g., `__metadata` files, import extension rewriting)] → Diff the old `vendor/poker-core` against the new build before first commit; consumers compile and run tests against the new vendor as the acceptance gate.
- [Vitest tolerance semantics differ from `assertAlmostEquals`] → `assertAlmostEquals(x, y, t)` is absolute tolerance; map to `expect(x).toBeCloseTo(y, digits)` carefully or hand-roll `Math.abs(x - y) <= t` for exactness in statistical tests.
- [Docker image size/runtime drift between deno and node images] → Pin `node:22-alpine`, verify compose bring-up via `run.sh` smoke test.
- [Lockfile version drift after rebuild changes package.json assembly] → CI check already fails on version disagreement; keep version in one place (`package.json` of core, read by build script).

## Migration Plan

Single-PR, ordered by dependency:

1. Port `src/core` to Node: `package.json` + tsconfigs, convert tests to Vitest, replace `build_npm.ts` with `scripts/build.mjs`, regenerate vendored output, run consumer builds/tests.
2. Port `src/calc-odds-api` to Express + tsx, update its Dockerfile to Node.
3. Update `core-vendor.yml` to Node-only steps; keep stale-vendor + lockfile-version checks.
4. Update `run.sh`, `AGENTS.md`, compose (if it references deno), remove `deno.json`/`deno.lock` files.

Rollback: `git revert` the migration commit(s); no data or infra state changes.

## Open Questions

None.
