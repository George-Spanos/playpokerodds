# Play Poker Odds monorepo

This is the repository for every service that relates to https://playpokerodds.com.

# App Structure

Code of this repo is found inside the `src` folder. This folder includes the following services:

- UI folder - Angular front end of the app
- web-api folder - The web api of the app, written in Express & Typescript
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

`src/core` is a Deno project and is **not** published to any registry. The npm
consumers (`src/ui`, `src/web-api`) install it from a vendored build that is
committed to the repo, so a plain `npm install` works with no registry auth:

```jsonc
"@moby-it/poker-core": "file:./vendor/poker-core"
```

After changing anything under `src/core/src`, rebuild and re-vendor it:

```sh
cd src/core
deno task test
deno task build:npm   # requires deno + node
```

That regenerates `src/ui/vendor/poker-core` and `src/web-api/vendor/poker-core`
(ESM + CommonJS + type declarations, via [dnt](https://jsr.io/@deno/dnt)).
**Commit the regenerated vendor folders** — the Docker builds copy them in and
never reach a registry for this package.

The `.github/workflows/core-vendor.yml` workflow enforces this: it reruns the
build on CI and fails if the committed vendor folders differ from its output, so
a forgotten re-vendor is a red build rather than a stale image.

Note: `src/calc-odds-api` is a Deno service and consumes core as Deno source
directly, via the `"@poker-core/" -> "../core/src/"` mapping in its `deno.json`
— no vendoring involved. Because of that its Docker build context is `src/`
rather than `src/calc-odds-api` (see `src/.dockerignore`), and a change under
`src/core` rebuilds it too.
