#!/bin/sh
set -e

# Set RUN_MIGRATIONS=true in the container environment to apply pending
# Prisma migrations before the server starts. Recommended for single-instance
# deployments. For multi-replica setups, run migrations as a separate job.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[entrypoint] Applying database migrations..."
  node node_modules/.bin/prisma migrate deploy \
    --schema /app/server/prisma/postgresql/schema.prisma
  echo "[entrypoint] Migrations applied."
fi

exec "$@"
