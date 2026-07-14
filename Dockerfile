# Living Heirloom — single-image build: frontend + API + scheduler + voice.
# node:24-slim (glibc) so better-sqlite3 and onnxruntime-node use prebuilt binaries.

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY server ./server

# Letters database, delivery outbox, and voice cache live here.
VOLUME /app/server/data

EXPOSE 3001
CMD ["npx", "tsx", "server/index.ts"]
