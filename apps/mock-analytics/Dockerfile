FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.4

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/mock-analytics/package.json ./apps/mock-analytics/
RUN pnpm install --frozen-lockfile --filter mock-analytics...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/mock-analytics/node_modules ./apps/mock-analytics/node_modules
COPY apps/mock-analytics ./apps/mock-analytics
RUN pnpm --filter mock-analytics build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/mock-analytics/node_modules ./apps/mock-analytics/node_modules
COPY --from=builder /app/apps/mock-analytics/dist ./apps/mock-analytics/dist

USER node
EXPOSE 3002
CMD ["node", "apps/mock-analytics/dist/main.js"]
