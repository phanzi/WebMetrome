FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/out ./
RUN npm install -g serve concurrently

ENV NODE_ENV=production
EXPOSE 3000 4000

CMD ["concurrently", "'serve -p 3000 dist'", "'node server.js'"]
