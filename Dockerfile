# Build stage - install dependencies
FROM oven/bun:1-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Production stage
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
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
