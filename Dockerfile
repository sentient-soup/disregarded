# Build stage - build frontend assets
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Install ALL dependencies (including devDependencies for build)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY src ./src
COPY build.ts ./
RUN bun run build

# Production stage
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# Install production dependencies only
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Copy server source (still needed for API routes)
COPY src ./src
COPY package.json ./

# Create data directory for database
RUN mkdir -p /data

# Environment variables with defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/disregarded.db
ENV JWT_EXPIRY=86400
ENV REGISTRATION_ENABLED=true
ENV MAX_ESSAY_LENGTH=500000

# JWT_SECRET is required - no default (will fail at runtime if not set)

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["bun", "run", "src/index.ts"]

LABEL org.opencontainers.image.source=https://github.com/sentient-soup/disregarded
