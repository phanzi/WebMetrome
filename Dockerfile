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
COPY --from=builder /app/out ./out
RUN addgroup -S app && adduser -S app -G app
RUN chown -R app:app /app
USER app

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD ["sh", "-c", "wget -qO- http://127.0.0.1:${PORT:-4000}/health >/dev/null || exit 1"]

CMD ["./out/server"]
