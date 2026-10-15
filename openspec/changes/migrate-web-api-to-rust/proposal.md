## Why

The Express + Prisma API carries a heavy Node dependency chain (Express middleware chains, Passport, Prisma client generation, tsc-alias builds) for a compact CRUD-plus-auth service. The user has approved a Rust migration. Rust (axum + sqlx) replaces it with a single static binary, compile-time-checked SQL, and no client-generation step, while the public HTTP contract and the Postgres schema stay compatible with the deployed database and existing clients.

## What Changes

- **BREAKING** (repo-internal): `src/web-api` is rewritten from Express/TypeScript/Prisma to Rust (axum + sqlx + tokio), keeping the same container port (3000) and env contract (`DB_CONNECTION_STRING`, `JWT_SECRET`, `CALC_ODDS_URL`, `CALC_ODDS_KEY`, `LEADERBOARD_MIN_GAMES`).
- All endpoints are preserved path-for-path with matching methods, status codes, and payload shapes: auth (login, register, refreshToken, admin-login), poker (postNewRoundAnswer, postExistingRoundAnswer, addToFavorites/:roundId, removeFromFavorites/:roundId, fetchRoundById/:id, fetchRound, fetchLeaderboards, fetchRandomRound, fetchEvents), user (update, fetchByUsername/:username), health (readiness, liveness, logError).
- JWT parity: HS256 tokens with the same claims (`userId`, `email`, `role`, 4-day expiry), signed/verified against `JWT_SECRET`, so existing client sessions and the token interceptor pattern keep working.
- Password hashing moves from bcrypt (cost 10) to argon2id; existing bcrypt hashes are transparently verified and re-hashed on successful login (transparent upgrade, no user-visible change).
- Domain logic formerly imported from `@moby-it/poker-core` (round creation from inputs, random round generation, guess scoring `|estimate - odds|` at 2-dp) is re-implemented in Rust with identical behavior; the vendored package stops being a web-api dependency.
- Prisma migrations are replaced by a plain SQL migration baseline (same tables/columns); `prisma migrate deploy` leaves the workflow.
- Jest functional tests are replaced by Rust integration tests exercising the same endpoint contracts.

## Capabilities

### New Capabilities
- `web-api-service`: The Rust web API: HTTP contract (all routes, status codes, payloads), JWT auth, scoring, and persistence behavior.
