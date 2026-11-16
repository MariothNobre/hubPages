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

FROM node:22.22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PORT=8080
ENV STATIC_DIR=/app/public
ENV DATA_FILE=/data/content.json
WORKDIR /app
COPY --from=builder --chown=10001:10001 /app/dist ./public
COPY --chown=10001:10001 server ./server
RUN mkdir -p /data && chown 10001:10001 /data
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=5 --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:8080/health.json').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
