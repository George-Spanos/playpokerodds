# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: vanilla JavaScript (no framework) — the user's explicit migration target for this surface. Static ES modules, no build-time framework runtime. Existing Angular 17 implementation is the incumbent to be replaced; Node/npm tooling stays only for what the migration needs (dev server, tests, lint if adopted).

## Users

Primary users are poker hobbyists training: recreational and semi-serious players who play a round, guess their winning chances, and compare the guess against calculated odds to build preflop/postflop intuition. Sessions are short, repeatable, and self-paced. Secondary usage (account features: history, favorites, leaderboards) supports the training loop but is not the core path.

## Product Purpose

Play Poker Odds! is a poker equity training game. The user is dealt a hand (plus a board in later streets), optionally sees opponents' known hands, guesses their win percentage, and the app reveals the Monte-Carlo-calculated odds. Success means users develop an accurate internal sense of poker odds — measured by guess-vs-actual accuracy improving over time.

## Positioning

"Forget about bets. Focus on winning chances." — a deliberate single-mechanism trainer: no chips, no betting, no opponents to outplay; only equity estimation against random or known hands. Neighboring products (equity calculators, coaches) present odds as lookup tools; this product drills intuition through repeated guessing.

## Operating Context

- Core loop: play a round → guess odds → reveal result → next round.
- Random rounds deal an unknown opponent range (`'..'` hands); boards progress from preflop (empty) to river.
- Account features persist rounds, compute guess accuracy, and feed leaderboards, but an anonymous visitor can play immediately.
- Odds are computed server-side (calc-odds-api) with a fixed iteration count; accuracy is quantized (odds rounded to 2 decimals, e.g. 13.64).

## Capabilities and Constraints

- Client renders cards from static card assets; card faces use standard rank/suit notation ('Ac', 'Td', '2s', '..' for unknown).
- Guess input is a percentage; results compare guess vs calculated odds.
- Web-API provides auth (JWT), round history, favorites, leaderboards.
- Poker odds calculation logic is vendored (`@moby-it/poker-core`); the UI can also call the odds service.
- Terminology: "round", "board", "hand", "opponents", "odds", "guess accuracy".

## Brand Commitments

- Product name: "Play Poker Odds!" — keep exactly.

## Evidence on Hand

- Existing Angular implementation (to be replaced by vanilla JS): `src/ui` — routes: home/play, leaderboards, auth, user profile/history/favorites.
- Tagline in current `index.html` meta description: "Forget about bets. Focus on winning chances."
- Card art assets and component CSS live under `src/ui/src/styles/` and `src/ui/public/`.

## Product Principles

1. **The guess comes first.** Every flow protects the reveal: the user commits a guess before seeing odds.
2. **Zero friction to play.** An anonymous visitor reaches a dealt round in one interaction.
3. **Feedback builds intuition.** Show the gap between guess and reality clearly; history and accuracy stats serve this.
4. **One mechanism, done well.** No feature creep into betting or multiplayer; equity training only.

## Accessibility & Inclusion

- No product-specific standard established yet (undecided: target WCAG level).

## Open Decisions

- Visual world, typography, palette: to be designed in new-work (full redesign approved; only the name is fixed).
