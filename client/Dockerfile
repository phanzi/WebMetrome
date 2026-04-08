FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
COPY .env.build .env.build
RUN npm run build

EXPOSE 3000 4000

CMD ["npm", "run", "start"]
