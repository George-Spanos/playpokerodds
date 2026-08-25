FROM node:20.11.0-alpine AS dependencies
WORKDIR /src
COPY package*.json ./
# poker-core is vendored from src/core (deno task build:npm), not published
COPY vendor ./vendor
RUN npm ci -f


FROM dependencies AS build
WORKDIR /src
COPY . ./
RUN npx prisma generate
RUN npm run build


FROM node:20.11.0-alpine

LABEL org.opencontainers.image.source=https://github.com/moby-it/playpokerodds

RUN apk --no-cache add curl
EXPOSE 3000
WORKDIR /src
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health/liveness || exit 1

COPY --from=build /src/node_modules ./node_modules
# node_modules/@moby-it/poker-core is a symlink into ./vendor
COPY --from=build /src/vendor ./vendor
COPY --from=build /src/dist ./dist
COPY --from=build /src/prisma ./prisma
COPY ./package*.json ./
CMD ["npm","start"]
