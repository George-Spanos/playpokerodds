## 1. Core package → Node

- [ ] 1.1 Add `package.json` (`@moby-it/poker-core`, version 2.1.3, scripts: `test`, `build`) and base + esm/cjs tsconfigs to `src/core`; verify `npx tsc -p tsconfig.esm.json` and `npx tsc -p tsconfig.script.json` compile clean against existing sources
- [ ] 1.2 Add Vitest; convert the five `*.test.ts` files (`board`, `card`, `deck` is covered via `createDeck` in round tests if present, `hand`, `round`, `calculate-odds`) from `Deno.test`/`std/assert` to Vitest, mapping `assertAlmostEquals` to exact absolute-tolerance checks; verify `npm test` passes in `src/core`
- [ ] 1.3 Replace `scripts/build_npm.ts` with `scripts/build.mjs` (clean → tsc ×2 → assemble package.json with dual `exports` → copy LICENCE/README → sync into `src/ui/vendor/poker-core` and `src/web-api/vendor/poker-core`); verify `npm run build` regenerates both vendor dirs
- [ ] 1.4 Diff old vs new vendored output; confirm consumer `package-lock.json` still resolves `@moby-it/poker-core` (bump or re-link only if npm requires it); verify `npm run build` and `npm test` pass in `src/web-api` unchanged, and `npm run build` passes in `src/ui`

## 2. calc-odds-api → Express

- [ ] 2.1 Initialize npm package in `src/calc-odds-api` (express, typescript, tsx; scripts `dev`/`build`/`start`); port `main.ts` from oak to Express preserving routes, status codes, `x-api-key` gating, `ITERATIONS`/`APIKEY`/`PORT` env handling; import core via relative source or workspace path consistent with the vendored model; verify `npm run dev` serves `/liveness` and rejects a bad round with 400
- [ ] 2.2 Rewrite `src/calc-odds-api/Dockerfile` on `node:22-alpine` (npm ci → tsc → node dist), drop the Deno pin comment; verify the image builds and the service is reachable from web-api via compose

## 3. CI + repo cleanup

- [ ] 3.1 Update `.github/workflows/core-vendor.yml`: replace setup-deno + deno tasks with Node checkout → `npm test` → `npm run build` in `src/core`; keep the stale-vendor diff check (drop `src/core/deno.lock` from the path list) and the lockfile-version check; verify with `act` or workflow YAML lint
- [ ] 3.2 Delete `src/core/deno.json`, `src/core/deno.lock`, `src/core/scripts/build_npm.ts`, `src/calc-odds-api/deno.json`, `src/calc-odds-api/deno.lock`; update `run.sh`, `AGENTS.md`, and `docker-compose*.yml` references from Deno commands to npm equivalents; verify `grep -ri deno src/ .github/ run.sh` shows only historical/comment mentions or none
- [ ] 3.3 Full-stack smoke: `./run.sh` brings up all four services; POST a valid round to calc-odds-api through web-api or directly and observe 200 `{ odds }`; run `src/core` Vitest, `src/web-api` Jest, and UI build one final time
