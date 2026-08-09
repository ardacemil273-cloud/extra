FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package*.json ./

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 4000

CMD ["node", "dist/main.js"]
