# Play Poker Odds monorepo

This is the repository for every service that relates to https://playpokerodds.com.

# App Structure

Code of this repo is found inside the `src` folder. This folder includes the following services:

- UI folder - Vanilla JS front end of the app (ES modules + CSS, no framework)
- web-api folder - The web api of the app, written in Rust (axum + sqlx)
- calc-odds-api - Contains the `calculateWinningOdds` operation which is the most critical operation **and the most cpu expensive**. This is why it's deployed seperately, even if it's a single endpoint. Written in Rust (axum), like the web-api.
# How To Run

- Make sure you have [docker installed](https://docs.docker.com/desktop/)
- Run `run.sh` script.

# Container images

Each service publishes to GHCR under `ghcr.io/george-spanos/*` (`ppo-ui`, `ppo-api`,
`ppo-calc-odds`) from the workflows in `.github/workflows`. They authenticate with the
built-in `GITHUB_TOKEN`, so **this repo needs no registry secrets** - a fork or a
transfer keeps working with nothing to re-provision. The namespace is written out in
full rather than derived from `github.repository_owner`, because GHCR rejects
uppercase in image references and the owner is `George-Spanos`.

`docker-compose.prod.yml` pulls those same tags, so the two must be changed together.

# Domain engine history

The poker odds engine originally lived in `src/core` (TypeScript for Deno) and
was consumed via a vendored npm package. Every consumer has since been ported:
the web-api (Rust) and calc-odds-api (Rust) carry native implementations, and
the UI re-implements its client-side subset in JS. The crate was removed; see
git history for the original engine, and `src/calc-odds-api/src/evaluate.rs`
for the authoritative Rust port.

# Working on the Rust web-api

`src/web-api` is a single axum + sqlx crate. Tests split into unit tests beside
the code and an endpoint contract suite in `tests/integration.rs` that needs a
Postgres:

```sh
cd src/web-api
cargo test --lib                       # pure unit tests
docker run -d --name ppo-test-db -p 5432:5432 \
  -e POSTGRES_USER=root -e POSTGRES_PASSWORD=root -e POSTGRES_DB=gtop postgres:15.1
TEST_DATABASE_URL=postgres://root:root@localhost:5432/gtop \
JWT_SECRET=SOME_SECRET CALC_ODDS_URL=http://localhost:7071/api/calcOdds \
  cargo test --test integration -- --test-threads=1
```

The suite runs serially: the tests share one database and clean it between
cases. The schema baseline in `migrations/0001_baseline.sql` applies
idempotently at startup, so the service starts against a database that the old
Prisma API created.
