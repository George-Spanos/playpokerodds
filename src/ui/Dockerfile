# The npm build (npm run build) runs in CI / locally before docker build;
# dist/ must exist in the context.
FROM nginx:1.27-alpine
LABEL org.opencontainers.image.source=https://github.com/George-Spanos/playpokerodds

COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=5s --start-period=3s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1
