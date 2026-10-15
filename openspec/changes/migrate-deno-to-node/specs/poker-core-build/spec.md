# poker-core Build & Distribution

## Purpose

Defines how the `@moby-it/poker-core` package is built from `src/core` sources, tested, and distributed to npm consumers (`src/ui`, `src/web-api`) as a vendored `file:` dependency.

## ADDED Requirements

### Requirement: Node-based core build
The poker-core package SHALL be buildable with Node.js tooling only (no Deno runtime required), producing a distributable package with ESM and CJS entry points, TypeScript declarations, and correct `exports`/`types` conditions for modern module resolution.

#### Scenario: fresh clone build
- **WHEN** a developer with Node.js and npm installed runs the core build command in a fresh clone
- **THEN** the build succeeds without any Deno dependency, and the output package contains ESM and CJS modules, `.d.ts` declarations, and a `package.json` whose `exports` map resolves types under modern `moduleResolution` settings

#### Scenario: vendored output reaches all consumers
- **WHEN** the core build command runs
- **THEN** the built package replaces the contents of `src/ui/vendor/poker-core` and `src/web-api/vendor/poker-core`, and both consumers' `package-lock.json` continue to resolve `@moby-it/poker-core` to the vendored copy with a matching version

### Requirement: unchanged public API
The vendored package SHALL expose the same public surface as before the migration: `calculateOdds`, `calculateGuessAccuracy`, `createRound`, `createRandomRound`, `validateRound`, `Hand`, `Board`, `Round`, and related domain types, with unchanged runtime behavior.

#### Scenario: consumer compiles and behaves identically
- **WHEN** `src/web-api` and `src/ui` compile and run their existing test suites against the rebuilt vendored package
- **THEN** compilation succeeds with no consumer source changes, and odds-calculation results remain within the existing statistical tolerances of the core test suite

### Requirement: core test suite runs on Node
The core package's test suite SHALL run under a Node.js test runner without a Deno runtime, covering the existing test cases (hand evaluation, board state, card generation, deck, round creation, odds calculation statistics).

#### Scenario: tests run in CI without Deno
- **WHEN** CI runs the core test command on a Node.js runner
- **THEN** all existing core test cases pass, including statistical assertions on calculated odds with the same tolerance semantics

### Requirement: stale-vendor detection preserved
CI SHALL continue to fail when the committed vendored copies of poker-core do not match a rebuild from the committed core sources.

#### Scenario: out-of-date vendor committed
- **WHEN** a push modifies core sources without rebuilding and committing the vendored output
- **THEN** the core CI workflow fails with an error instructing the developer to rebuild and commit the vendored package

### Requirement: odds service contract unchanged
The calc-odds-api service SHALL preserve its external HTTP contract after the runtime migration: `POST /api/calcOdds` with a round payload returns `{ odds }`, rejects unparseable bodies with 400, rejects invalid rounds with 400, enforces the `x-api-key` header against the `APIKEY` env (403 on mismatch, open when unset), `GET /liveness` responds with a liveness confirmation, and `ITERATIONS` controls Monte Carlo sample count with a 50,000 default on invalid values.

#### Scenario: valid odds request
- **WHEN** a client POSTs a valid round payload to `/api/calcOdds` with a correct `x-api-key` header (when `APIKEY` is set)
- **THEN** the service responds 200 with `{ odds }` computed from the round and the configured iteration count

#### Scenario: invalid requests rejected
- **WHEN** a client POSTs an unparseable body or a round failing validation
- **THEN** the service responds 400 without computing odds

#### Scenario: liveness and auth gating
- **WHEN** a client GETs `/liveness`, or POSTs `/api/calcOdds` with a missing/wrong `x-api-key` while `APIKEY` is set
- **THEN** liveness responds with a success confirmation, and the odds request responds 403 without computing
