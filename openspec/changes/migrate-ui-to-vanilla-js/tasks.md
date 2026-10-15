## 1. Scaffold

- [ ] 1.1 Replace Angular scaffolding: `index.html` (name, tagline, Manrope→chalk-world fonts), `src/js/main.js` + `router.js`, `src/styles/tokens.css` + `chalk.css`; strip Angular/RxJS/zone.js/immer/ngx-toastr/poker-core from package.json and devdeps; static dev-server script; verify shell serves and renders
- [ ] 1.2 Design system per `.impeccable/surfaces/src-ui.md`: slate ground, chalk line work, amber-ochre accent, chalk-line nav, state grammar (solid/dashed/ghost), themed browser surfaces (selection, focus, scrollbar); verify on shell at 1440 and 390

## 2. Domain + plumbing

- [ ] 2.1 Port domain module from poker-core semantics (`createRoundInputs` rng, board-state map, `calculateGuessScore` 2-dp, round validation); Vitest unit tests; verify `npm test`
- [ ] 2.2 API client (fetch wrapper, token attach, refresh-on-401, all live endpoints) + auth state (register/signin/refresh/logout, localStorage token, top-bar user status)

## 3. Surfaces

- [ ] 3.1 Play: deal via toggle (fetchRound / fetchRandomRound), poker table (real card faces / chalk outlines), 0–100 guess rail with live chalk cursor, lock-on-reveal signature interaction, post-round actions (next deal, favorite, share `/play/:id` deep link via fetchRoundById + postExistingRoundAnswer)
- [ ] 3.2 Auth forms (register/signin, error states), about page
- [ ] 3.3 Leaderboards (ranked rows, empty state)
- [ ] 3.4 Profile: history (guess/odds/score), favorites toggle, settings form; foreign-profile masking (odds/estimate −1); router routes `/`, `/play`, `/play/:id`, `/leaderboards`, `/profile`, `/about`, catch-all `/`
- [ ] 3.5 Responsive + a11y: 390px single-column play, keyboard operability, focus states, AA contrast

## 4. Finish

- [ ] 4.1 Delete Angular sources/tests/assets no longer used; verify `grep -r "@angular\|poker-core" src/ui/src src/ui/package.json` empty
- [ ] 4.2 Dockerfile → nginx:alpine static; compose update; verify image builds and serves
- [ ] 4.3 `impeccable detect --json`, batched screenshots (1440 + 390) into `.impeccable/review/`, spawn `impeccable-finish-reviewer`, apply fixes; write DESIGN.md via `impeccable-documenter`
- [ ] 4.4 Browser smoke: full loop deal → guess → reveal → favorite → signin → profile shows the round
