# Pinned to deno 1.x on purpose: oak v14 predates deno 2, and under deno 2 it
# misdetects the runtime as Node (deno 2 added a global `process`) and binds
# 127.0.0.1 instead of 0.0.0.0, making this service unreachable from web-api.
# Upgrading the runtime means upgrading oak first. deno.lock is a v3 lock to
# match: regenerate it with `docker run --rm -v "$PWD/src:/app" \
#   -w /app/calc-odds-api denoland/deno:1.41.0 deno cache main.ts`, not with a
# local deno 2, which writes a v5 lock this image cannot read.
FROM denoland/deno:1.41.0

ENV PORT=7071
EXPOSE $PORT

# Build context is src/, not src/calc-odds-api: core is consumed as Deno source
# via the "@poker-core/" -> "../core/src/" mapping in deno.json.
WORKDIR /app
COPY core ./core
COPY calc-odds-api ./calc-odds-api

WORKDIR /app/calc-odds-api
RUN deno cache main.ts

CMD exec deno run --allow-net --allow-env main.ts
