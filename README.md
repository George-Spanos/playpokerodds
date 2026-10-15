# Play Poker Odds monorepo

This is the repository for every service that relates to https://playpokerodds.com.

# App Structure

Code of this repo is found inside the `src` folder. This folder includes the following services:

- UI folder - Vanilla JS front end of the app (ES modules + CSS, no framework)
- web-api folder - The web api of the app, written in Rust (axum + sqlx)
- core folder - This repo contains all the domain types + the business logic for core functional operations. It is written for Deno and is no longer published to a registry; see [Working on core](#working-on-core).
- calc-odds-api - Contains a solution that currently only contains the `calculateWinningOdds` operation which is the most critical operation **and the most cpu expensive**. This is why it's deployed seperately, even if it's a single endpoint.
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

# Working on core

`src/core` is a Deno project and is **not** published to any registry. The one
remaining npm consumer (`src/web-api` no longer uses it; `src/ui` re-implements
its client-side subset in JS) installs it from a vendored build that is
committed to the repo:

```jsonc
"@moby-it/poker-core": "file:./vendor/poker-core"
```

After changing anything under `src/core/src`, rebuild and re-vendor it:

```sh
cd src/core
deno task test
deno task build:npm   # requires deno + node
```

That regenerates `src/ui/vendor/poker-core` (ESM + CommonJS + type
declarations, via [dnt](https://jsr.io/@deno/dnt)). **Commit the regenerated
vendor folder** — the Docker builds copy it in and never reach a registry for
this package.

Note: `src/calc-odds-api` is a Deno service and consumes core as Deno source
directly, via the `"@poker-core/" -> "../core/src/"` mapping in its `deno.json`
— no vendoring involved. Because of that its Docker build context is `src/`
rather than `src/calc-odds-api` (see `src/.dockerignore`), and a change under
`src/core` rebuilds it too.

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
