# ── Stage 1: Build ──────────────────────────────────────────
FROM node:24-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy source code and build JavaScript to dist/
COPY tsconfig.json ./
COPY src ./src/
RUN npx tsc

# ── Stage 2: Production Runtime ─────────────────────────────
FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy generated Prisma client from builder
COPY --from=builder /app/src/generated ./src/generated
# Copy compiled output from builder
COPY --from=builder /app/dist ./dist
# Copy prisma files for runtime migrations/seeds
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Run as non-root user
USER node

EXPOSE 3000

# Direct node invocation so SIGTERM is handled directly without wrapper
CMD ["node", "dist/src/server.js"]
