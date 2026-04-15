FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY prisma ./prisma/
RUN npx prisma generate
COPY src ./src/
RUN npm run build

FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
