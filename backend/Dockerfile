FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS deps

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS builder

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM base AS runner

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --chown=nestjs:nodejs prisma ./prisma
COPY --chown=nestjs:nodejs package*.json ./

USER nestjs

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy; node dist/main.js"]
