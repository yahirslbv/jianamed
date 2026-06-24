# Build the Vite client once; it is only served by Express when
# SERVE_STATIC_FRONTEND=true at runtime.
FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS frontend-build
COPY . ./
RUN npm run build

FROM dependencies AS runtime-dependencies
COPY server/prisma/postgresql ./server/prisma/postgresql
RUN npx prisma generate --schema server/prisma/postgresql/schema.prisma

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY --from=runtime-dependencies /app/node_modules ./node_modules
COPY server ./server
COPY scripts ./scripts
COPY --from=frontend-build /app/dist ./dist

# A provider must mount /app/uploads/products as a persistent volume.
RUN mkdir -p /app/uploads/products && chown -R node:node /app
USER node
EXPOSE 4000
CMD ["node", "server/index.js"]
