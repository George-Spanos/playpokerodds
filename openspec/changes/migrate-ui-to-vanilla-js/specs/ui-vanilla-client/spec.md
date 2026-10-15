# Vanilla JS Client

## Purpose

Defines the framework-free client for Play Poker Odds!: its play loop, surfaces, API integration, and the approved chalkboard visual world.

## ADDED Requirements

### Requirement: Play loop
The client SHALL let any visitor (no auth required) play the core loop: request a dealt round, commit a numeric guess (0–100), and receive the calculated odds, score, and round id in response. Revealed-cards mode requests a round with all opponent hands known; hidden mode requests a random round with unknown opponent hands.

#### Scenario: anonymous visitor plays a round
- **WHEN** a visitor with no account deals a round in revealed mode, guesses 65, and submits
- **THEN** the client fetches a round from `/poker/fetchRound` with generated inputs (boardState 0–2, totalHands 2–5, all hands known), POSTs the guess to `/poker/postNewRoundAnswer`, and displays the returned odds and score without any sign-in prompt blocking play

#### Scenario: hidden-cards round
- **WHEN** the visitor toggles revealed cards off and deals
- **THEN** the round comes from `/poker/fetchRandomRound` and opponent hands render as unknown (card backs / chalk outlines), not as specific cards

### Requirement: Signature reveal interaction
The play surface SHALL implement the lock-on-reveal interaction: the visitor's guess mark locks on the 0–100 rail at commit, the true odds draw in beside it, and the guess-vs-truth delta is visually circled, per the approved direction contract.

#### Scenario: reveal animation
- **WHEN** a guess is submitted and the answer arrives
- **THEN** the guess mark stops free-running, the true odds marker animates into place beside it, and the error is marked with a hand-drawn-style chalk ellipse before the next deal is offered

### Requirement: Surfaces preserved
The client SHALL provide play (home), leaderboards, about, auth (register + signin), and profile (history, favorites, settings) surfaces, with routing equivalent to the Angular app (`/`, `/play`, `/leaderboards`, `/profile`, `/about`, catch-all redirect to `/`). Round sharing by id (play an existing round via `/play/:id`) is preserved via `/poker/fetchRoundById/:id`.

#### Scenario: deep link to a round
- **WHEN** a user opens `/play/<roundId>` for an existing round
- **THEN** the client fetches that round by id and presents it for a guess, posting to `/poker/postExistingRoundAnswer`

#### Scenario: unknown route redirects
- **WHEN** a user opens any unmatched path
- **THEN** the client routes to the home surface

### Requirement: Auth integration
The client SHALL support registration and sign-in against `/auth/register` and `/auth/login`, store the returned bearer token, attach it to requests that need it, refresh the session via `/auth/refreshToken` on load when a token exists, and surface sign-in state (username, score) in the top bar. Sign-out clears the stored token locally.

#### Scenario: session persistence across reloads
- **WHEN** a signed-in user reloads the page with a valid token in localStorage
- **THEN** the client calls `/auth/refreshToken`, restores the signed-in state, and shows the username and score

#### Scenario: failed refresh signs out
- **WHEN** the stored token is expired or invalid
- **THEN** the client clears it and presents the anonymous state without blocking play

### Requirement: Profile and favorites
The client SHALL render the signed-in user's profile from `/user/fetchByUsername/:username` — rank, score, round history with guess/odds/score per round, favorite round ids — and let the user add/remove favorites via `/poker/addToFavorites/:roundId` and `/poker/removeFromFavorites/:roundId`, updating the view without reload.

#### Scenario: viewing another user's profile
- **WHEN** the signed-in user views a different user's profile
- **THEN** that profile's round odds and estimates are hidden (the API masks them for non-owners) and the client renders them masked, without errors

### Requirement: Leaderboards
The client SHALL fetch `/poker/fetchLeaderboards` and render username, score, and games played per row.

#### Scenario: leaderboards render
- **WHEN** the user opens the leaderboards surface
- **THEN** rows render sorted by the API's ascending-score order with position numbers, and empty state is handled without a crash

### Requirement: Chalkboard visual world
The client SHALL implement the approved chalkboard odds-sheet design system: green-black slate ground, chalk-white line work and lettering, amber-ochre chalk accent, chalk-drawn panel frames, real card-face assets as the only full-color objects, chalk-line navigation (no pills), and the state grammar solid chalk = committed / dashed = pending / ghost smudge = last round. The product name "Play Poker Odds!" is preserved; the previous Angular UI's look is replaced.

#### Scenario: visual system recognizable without content
- **WHEN** any surface renders with content removed
- **THEN** the slate ground, chalk line work, and chalk typography remain identifiable as the committed world

### Requirement: Framework-free delivery
The client SHALL ship as static ES modules + CSS + assets, buildable and servable without Angular, RxJS, or zone.js, with no runtime dependency on the vendored poker-core package. Browser targets are evergreen (ES2022).

#### Scenario: dependency purge
- **WHEN** the migration completes
- **THEN** `src/ui/package.json` contains no Angular, RxJS, immer, ngx-toastr, or zone.js dependencies, and `grep -r "poker-core" src/ui/src` returns no client-code matches

### Requirement: Responsive and accessible
The client layouts SHALL be first-class on both desktop (≥1024px) and mobile (390px) widths, with keyboard-operable controls, visible focus states, and WCAG AA contrast for text on the slate ground.

#### Scenario: mobile play
- **WHEN** the play surface is used at 390px width
- **THEN** the deal, rail, and reveal actions are thumb-reachable in a single column without horizontal scrolling

#### Scenario: keyboard play
- **WHEN** a keyboard user tabs through the play surface
- **THEN** guess input, reveal, and deal are reachable and operable, with visible focus indication
