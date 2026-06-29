# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — builder
# Installs ALL deps (including dev), compiles native modules (bcrypt),
# generates Prisma client for PostgreSQL, builds Vite SPA, then prunes dev deps.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Build tools required by bcrypt native addon (node-gyp)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generate Prisma client targeting PostgreSQL
RUN npx prisma generate --schema server/prisma/postgresql/schema.prisma

# Build Vite SPA (output → /app/dist)
RUN npm run build

# Drop dev dependencies — keeps the runner image lean (~40 % smaller)
RUN npm prune --omit=dev

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — runner
# Minimal production image: only runtime deps + compiled artifacts.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# dumb-init: lightweight PID 1 that correctly forwards SIGTERM/SIGINT to Node
RUN apk add --no-cache dumb-init

# Non-root user — reduces blast radius if a dependency is compromised
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 appuser

# ── Application files ─────────────────────────────────────────────────────────
COPY --from=builder --chown=appuser:nodejs /app/node_modules   ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/server         ./server
COPY --from=builder --chown=appuser:nodejs /app/dist           ./dist
COPY --from=builder --chown=appuser:nodejs /app/scripts        ./scripts
COPY --from=builder --chown=appuser:nodejs /app/package.json   ./package.json
COPY --chown=appuser:nodejs docker-entrypoint.sh               ./docker-entrypoint.sh

# Persistent upload directory — Fly.io volume is mounted here at runtime.
# The directory must exist so the server can start even before the first upload.
RUN mkdir -p /app/uploads/products && \
    chown -R appuser:nodejs /app/uploads && \
    chmod +x /app/docker-entrypoint.sh

USER appuser
EXPOSE 4000

# ── Defaults (overridden by Fly.io secrets / env vars) ───────────────────────
ENV NODE_ENV=production
ENV SERVE_STATIC_FRONTEND=true
ENV UPLOAD_DIR=/app/uploads/products

# dumb-init wraps the entrypoint so SIGTERM reaches Node, not sh
ENTRYPOINT ["dumb-init", "./docker-entrypoint.sh"]
CMD ["node", "server/index.js"]
