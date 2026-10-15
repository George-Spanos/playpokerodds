# Web API Service (Rust)

## Purpose

Defines the behavior of the Rust (axum + sqlx) web API: the public HTTP contract, authentication, scoring, and persistence. The contract is identical to the Express API it replaces; clients and the deployed Postgres schema are unaffected.

## ADDED Requirements

### Requirement: HTTP contract parity
The service SHALL expose every endpoint of the Express API at the same paths, methods, request/response shapes, and status codes: POST `/auth/login`, `/auth/register`, `/auth/admin-login`; GET `/auth/refreshToken`; POST `/poker/postNewRoundAnswer`, `/poker/postExistingRoundAnswer`; PUT `/poker/addToFavorites/:roundId`, `/poker/removeFromFavorites/:roundId`; GET `/poker/fetchRoundById/:id`, `/poker/fetchRound`, `/poker/fetchLeaderboards`, `/poker/fetchRandomRound`, `/poker/fetchEvents`; PUT `/user/update`; GET `/user/fetchByUsername/:username`; GET `/health/readiness`, `/health/liveness`; POST `/health/logError`.

#### Scenario: full route parity
- **WHEN** the functional test suite from the Express API is executed against the Rust service
- **THEN** every endpoint responds with the same status codes and response JSON shapes as the Express implementation

#### Scenario: fetchRound validation parity
- **WHEN** `/poker/fetchRound` receives query params boardState outside 0–3, totalHands outside 1–9, or totalKnownHands greater than totalHands
- **THEN** the service responds 400 in each case, matching the Express validator

### Requirement: JWT auth parity
The service SHALL issue HS256 JWTs signed with `JWT_SECRET` containing claims `userId`, `email`, `role` and a 4-day expiry, and SHALL verify bearer tokens on protected endpoints, extracting the same `userId`/`email`/`role` payload the Express middleware exposed.

#### Scenario: token issued at login is accepted
- **WHEN** a user logs in and uses the returned token on `/user/update`
- **THEN** the service accepts it and applies the update to the correct user

#### Scenario: expired or invalid token rejected
- **WHEN** a request carries an expired, tampered, or absent token on a protected endpoint
- **THEN** the service responds 401

### Requirement: Scoring and odds pipeline parity
For a posted answer the service SHALL: validate the round payload; obtain odds from the calc-odds service (`CALC_ODDS_URL` with `x-api-key: CALC_ODDS_KEY`, 500 with the 3301 error text when unset); compute score as `|estimate − odds|` rounded to 2 decimals; persist a new Round + RoundAnswer (and Event of type USER_POSTED_ANSWER) for new rounds; reuse the stored round and its odds for existing-round answers; and return the RoundAnswerResponse shape `{ roundId, round, odds, estimate, score }`.

#### Scenario: new round answer
- **WHEN** an anonymous user POSTs a valid new round + estimate to `/poker/postNewRoundAnswer`
- **THEN** a Round and RoundAnswer row are persisted, an event is logged, and the response carries roundId, the round, odds, estimate, and score

#### Scenario: existing round answer
- **WHEN** a user POSTs `{ roundId, estimate }` to `/poker/postExistingRoundAnswer` for a stored round
- **THEN** no new Round row is created and the response uses the stored round's odds

#### Scenario: calc service unreachable
- **WHEN** `CALC_ODDS_URL` is unset and a new round answer is posted
- **THEN** the service responds 500 with the `3301: calc odds url not set` message

### Requirement: Running score maintenance
For authenticated answers, the service SHALL update the user's running score as the mean of per-round scores across distinct rounds played (same formula as the Express API: `(currentScore × (roundsPlayed − 1) + score) / roundsPlayed`).

#### Scenario: score updates after second distinct round
- **WHEN** a signed-in user with running score S over n distinct rounds answers a new distinct round with score x
- **THEN** the stored score becomes `(S × n + x) / (n + 1)`

### Requirement: Leaderboards and profile parity
`/poker/fetchLeaderboards` SHALL return users sorted by ascending score with `username`, `score`, `gamesPlayed`, filtered by `LEADERBOARD_MIN_GAMES` minimum distinct rounds. `/user/fetchByUsername/:username` SHALL return rank, 2-dp score, round history (distinct rounds, newest first, with 2-dp estimate/odds/score), and favorite round ids — masking odds/estimate (as −1) when the requester is not the profile owner.

#### Scenario: masked history for foreign profile
- **WHEN** user A fetches user B's profile
- **THEN** each returned round carries odds and estimate of −1, and B's own fetch shows real values

### Requirement: Round and card domain parity
Round generation and validation SHALL match poker-core semantics: 52-card deck in fixed order, hands of 2 distinct valid cards, opponent hands of either 2 cards or the unknown `'..'` marker, board size per state (0/3/4/5), unique cards across the round, and guess score at 2-decimal precision.

#### Scenario: generated round is always valid
- **WHEN** the service generates rounds for every boardState 0–3 and totalHands 2–9
- **THEN** every round passes the same validation it will enforce on posted rounds, with no duplicate cards

### Requirement: Password hashing migration
The service SHALL hash new/updated passwords with argon2id and SHALL still verify legacy bcrypt hashes, re-hashing to argon2id on successful login.

#### Scenario: legacy user logs in
- **WHEN** a user whose stored hash is bcrypt (from the Express API) logs in with the correct password
- **THEN** login succeeds and the stored hash is replaced with an argon2id hash; subsequent logins verify against argon2id directly

### Requirement: Persistence schema compatibility
The service SHALL run against the existing Postgres tables (`Users`, `Rounds`, `RoundAnswers`, `UserFavoriteRounds`, `UserRoles`, `Events`) via sqlx with the same columns and types as the Prisma schema baseline, using a plain SQL migration (no Prisma).

#### Scenario: service starts against existing database
- **WHEN** the Rust service starts against the database already populated by the Express API
- **THEN** migrations apply idempotently, and pre-existing users can log in and see their existing rounds and scores

### Requirement: Runtime and deployment parity
The service SHALL listen on port 3000, read the same env vars (`DB_CONNECTION_STRING`, `JWT_SECRET`, `CALC_ODDS_URL`, `CALC_ODDS_KEY`, `LEADERBOARD_MIN_GAMES`), serve CORS for the UI origins, and ship in Docker as a multi-stage rust build producing a statically-linked runtime image.

#### Scenario: compose bring-up
- **WHEN** `docker compose up` builds and starts the stack
- **THEN** the web-api container serves health endpoints on 3000 and the UI's cross-origin requests succeed
