FROM oven/bun:1.3-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM alpine AS runner
WORKDIR /app
RUN apk add libstdc++
COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["./dist/start"]
