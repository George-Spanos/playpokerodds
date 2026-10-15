## Why

The Angular 17 client is the repo's heaviest dependency surface (framework runtime, RxJS, NgRx-style stores, zone.js, Karma) for what is a five-view game. The product's design is also dated and casino-adjacent; the user has approved a full redesign (chalkboard odds-sheet world, see PRODUCT.md / .impeccable/surfaces/src-ui.md). Rebuilding the client as vanilla JavaScript ES modules removes the framework entirely while the redesign removes the old UI as a porting constraint — the two efforts reinforce each other.

## What Changes

- **BREAKING** (repo-internal): `src/ui` is rewritten as a framework-free vanilla JavaScript ES-module app (no Angular, no bundler-required build; static assets served as-is).
- Full visual redesign to the approved "chalkboard odds-sheet" world (slate ground, chalk line work, chalked 0–100 guess rail, lock-on-reveal signature interaction). Only the product name "Play Poker Odds!" is preserved as a brand commitment.
- All current user-facing capabilities are preserved: play loop (deal → guess → reveal), revealed-cards toggle, anonymous play, auth (register/signin/refresh), round history & profile, favorites, leaderboards.
- Client-side poker logic (round generation inputs, guess scoring, board-state mapping) is re-implemented in JS from `src/core` semantics; the vendored `@moby-it/poker-core` package is no longer a client dependency.
- The dead `fetchUserRounds` client call (no API endpoint exists) is dropped.
- Karma/Jasmine specs and Angular build tooling are removed; the suite is replaced by Vitest unit tests and browser-based smoke verification.

## Capabilities

### New Capabilities
- `ui-vanilla-client`: The vanilla JS client: routing, state, API integration, the chalkboard visual system, and the play/auth/profile/leaderboards surfaces.

### Modified Capabilities
- None at spec level. The HTTP contract between client and web-api is unchanged (same endpoints, same payloads); the server is not modified by this change.
