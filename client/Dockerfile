FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
