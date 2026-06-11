FROM node:20-slim AS base
# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@9.15.4

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter api...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter api prisma generate && \
    pnpm --filter api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY apps/api/prisma ./apps/api/prisma
RUN apps/api/node_modules/.bin/prisma generate --schema apps/api/prisma/schema.prisma

USER node
EXPOSE 3001
CMD ["sh", "-c", "apps/api/node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma && node apps/api/dist/src/main.js"]
