FROM node:22.22-bookworm-slim AS dependencies
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
ARG VITE_APP_ENV=production
ARG VITE_PUBLIC_URL=https://hubpages.com.br
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_PUBLIC_URL=$VITE_PUBLIC_URL
COPY . .
RUN pnpm build

FROM caddy:2.10.2-alpine AS runner
WORKDIR /srv
RUN cp /usr/bin/caddy /usr/local/bin/caddy-unprivileged \
  && chmod 0755 /usr/local/bin/caddy-unprivileged
COPY --from=builder --chown=10001:10001 /app/dist ./
COPY --chown=10001:10001 deploy/Caddyfile.container /etc/caddy/Caddyfile
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=5 --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/health.json || exit 1
CMD ["caddy-unprivileged", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
