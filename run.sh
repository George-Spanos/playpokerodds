#!/usr/bin/env bash
# Build and start the full local stack: db + calc-odds-api + web-api (Rust) + client-ui (nginx)
set -e
cd "$(dirname "$0")"

# the client image copies dist/ from the build context; build it first
(cd src/ui && npm run build)

docker compose build
docker compose up -d
