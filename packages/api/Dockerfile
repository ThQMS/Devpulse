# syntax=docker/dockerfile:1

# --- builder ---------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
# No package-lock.json in this pnpm monorepo, so `npm install` (not `npm ci`).
RUN npm install
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# --- runtime ---------------------------------------------------------------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
# dist already includes the .sql migrations (copied by the build step)
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1
CMD ["node", "dist/main.js"]
