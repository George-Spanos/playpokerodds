## 1. Rust API — scaffold and domain

- [ ] 1.1 Create `src/web-api` Rust crate (axum 0.7, sqlx postgres+runtime-tokio, tokio, jsonwebtoken, argon2, bcrypt, reqwest, rust_decimal, serde, tracing) with module tree `routes/{auth,poker,user,health}.rs`, `domain/`, `db/`; verify `cargo build` succeeds
- [ ] 1.2 Port domain logic from poker-core semantics: 52-card deck (fixed order), `createRound`, `createRandomRound`, `generateBoard` per state (0/3/4/5 cards), round/card validation (2 distinct valid cards, `'..'` unknown hands, no duplicates across round), `calculateGuessScore` (2-dp `|e−o|`); unit tests mirroring `src/core` test expectations; verify `cargo test`
- [ ] 1.3 Write `0001_baseline.sql` migration from `prisma migrate diff` (Users, Rounds, RoundAnswers, UserFavoriteRounds, UserRoles, Events) and sqlx migration runner; verify applying to a fresh Postgres and to a Prisma-migrated DB yields identical `\d` output

## 2. Rust API — endpoints and auth

- [ ] 2.1 Health endpoints (readiness, liveness, logError) + CORS + JSON; verify against Jest health.spec assertions
- [ ] 2.2 Auth: register, login (bcrypt-verify → argon2id rehash; user not found → 401 with message), admin-login, refreshToken (HS256, claims userId/email/role, 4d expiry); Events logged (USER_REGISTERED, USER_LOGGED_IN); verify tokens minted by old TS API validate in Rust suite
- [ ] 2.3 Poker read endpoints: fetchRound (query validation parity: boardState 0–3, totalHands 1–9, totalKnownHands ≤ totalHands, else 400), fetchRandomRound, fetchRoundById (400 no id / 404 missing), fetchLeaderboards (ascending score, LEADERBOARD_MIN_GAMES filter, gamesPlayed count), fetchEvents (pageSize/page/term)
- [ ] 2.4 Poker write endpoints: postNewRoundAnswer (validate → calc-odds call with x-api-key → 500 `3301` when unset → score 2-dp → persist Round+RoundAnswer+Event → running-score update for authed users → RoundAnswerResponse), postExistingRoundAnswer (reuse stored round/odds), addToFavorites/removeFromFavorites (401 unauth, 400 no roundId)
- [ ] 2.5 User endpoints: update (partial username/email/password; password → argon2id; 401 unauth; 400 invalid), fetchByUsername (rank, 2-dp score, distinct-round history newest-first with 2-dp values, favorites ids; odds/estimate masked to −1 for non-owner)
- [ ] 2.6 Port the 10 Jest functional specs to Rust integration tests (testcontainers or compose Postgres) with the same assertions; verify full suite passes

## 3. Rust API — deployment

- [ ] 3.1 Multi-stage Dockerfile (cargo layer-cached build → distroless/alpine runtime, static binary), env contract unchanged, port 3000; update compose + .github workflow; verify `docker compose build web-api` and container serves health endpoints
- [ ] 3.2 Remove Express sources, Prisma dir, Jest suite after cutover; keep `.env.example` (same vars); update AGENTS.md service description; verify `grep -r prisma src/web-api` empty

## 4. Vanilla JS client — scaffold and design system

- [ ] 4.1 Replace Angular scaffolding: `src/ui/index.html` (name, tagline meta, fonts) + `src/js/{main.js,router.js}` + `src/styles/{tokens.css,chalk.css}`; remove Angular deps from package.json; dev server script; verify static serve renders shell
- [ ] 4.2 Implement chalkboard design system per `.impeccable/surfaces/src-ui.md`: slate ground, chalk line work, amber accent, chalk-line nav, state grammar (solid/dashed/ghost), themed browser surfaces (selection, focus, scrollbar); verify tokens render on shell
- [ ] 4.3 Port card domain module (`createRoundInputs`, board-state map, `calculateGuessScore`, round validation) with Vitest unit tests; verify `npm test`

## 5. Vanilla JS client — surfaces

- [ ] 5.1 API client module (fetch wrapper, bearer token attach/refresh, all 15 live endpoints) + auth state module (register/signin/refresh/logout, localStorage token)
- [ ] 5.2 Play surface: deal (fetchRound/fetchRandomRound by toggle), poker table (real card faces for my hand + known opponents, chalk outlines for unknown), guess rail (0–100, live chalk cursor), lock-on-reveal signature interaction (locked guess mark, stroked-in true odds, chalk-circled error), post-round actions (next deal, favorite, share link via /play/:id deep-link)
- [ ] 5.3 Auth surfaces (register + signin forms with error states), about page
- [ ] 5.4 Leaderboards surface (ranked rows, empty state)
- [ ] 5.5 Profile surface: history list (guess/odds/score per round), favorites, settings form (username/email/password update), foreign-profile masking; router: `/`, `/play`, `/play/:id`, `/leaderboards`, `/profile`, `/about`, catch-all redirect
- [ ] 5.6 Responsive + a11y pass: 390px single-column play layout, keyboard operability, focus states, AA contrast on slate

## 6. Vanilla JS client — verification and finish

- [ ] 6.1 Remove Angular sources/tests, ngx-toastr/immer/rxjs/zone.js/poker-core from package.json and disk; verify `grep -r "poker-core\|@angular" src/ui/src src/ui/package.json` empty
- [ ] 6.2 Dockerfile → nginx:alpine static serve; compose update; verify image build + container serves the app
- [ ] 6.3 Run impeccable detector (`detect --json`), batched screenshots (desktop 1440 + mobile 390) into `.impeccable/review/`, spawn `impeccable-finish-reviewer`, apply fixes, write DESIGN.md via `impeccable-documenter`
- [ ] 6.4 Browser smoke of full loop against running stack: deal → guess → reveal → favorite → sign in → profile shows round

## 7. Integration

- [ ] 7.1 CI: replace Node/web-api jobs with Rust build/test + UI static checks; verify workflow lint
- [ ] 7.2 Full-stack `./run.sh` smoke: all services up, play loop works end-to-end through the Rust API; AGENTS.md + README updated; commit
