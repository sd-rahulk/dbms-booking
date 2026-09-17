FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL=file:/data/aeride.db
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/aeride.db
COPY --from=builder /app ./
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && npm run db:seed && npm start"]
