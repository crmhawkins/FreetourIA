# ==========================================
# Stage 1: Builder — compiles TypeScript
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including devDeps for build).
# Use `npm install` (not `npm ci`) because this app lives in an npm workspace
# whose lockfile sits at the monorepo root, not next to this Dockerfile.
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript to JavaScript
RUN npm run build

# ==========================================
# Stage 2: Production — minimal image
# ==========================================
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev --no-audit --no-fund; fi \
    && npm cache clean --force

# Copy compiled application from builder
COPY --from=builder /app/dist ./dist

# Copy Prisma client (generated binaries + CLI)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Copy Prisma schema and migrations
COPY prisma ./prisma

# Create audio storage directory
RUN mkdir -p storage/audio

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

# Lightweight healthcheck against /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

# Run database migrations, then start the server
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/src/main"]
