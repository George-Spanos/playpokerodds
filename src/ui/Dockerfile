# build environment
FROM node:20.11.0-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
# poker-core is vendored from src/core (deno task build:npm), not published
COPY vendor ./vendor
RUN npm ci

FROM dependencies AS build
ARG TARGET=prod
COPY . ./
RUN npm run build:${TARGET}

FROM nginx:1.23-alpine

LABEL org.opencontainers.image.source=https://github.com/moby-it/playpokerodds


COPY --from=build /app/dist/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
