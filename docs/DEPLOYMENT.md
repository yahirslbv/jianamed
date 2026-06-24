# Despliegue de preproduccion y produccion

Tic Toc Pharma conserva SQLite para desarrollo local. Los entornos publicos usan PostgreSQL, HTTPS, variables inyectadas por el proveedor y almacenamiento persistente para uploads. Nunca subas archivos `.env`, bases, backups, logs ni imagenes reales.

## Arquitectura recomendada

La opcion recomendada es frontend Vite estatico + API Express + PostgreSQL administrado + volumen persistente (u object storage futuro) para uploads. Configura `FRONTEND_ORIGINS` con el dominio exacto del frontend y deja `SERVE_STATIC_FRONTEND=false`.

Tambien se admite un despliegue unificado. Construye el frontend y define `SERVE_STATIC_FRONTEND=true`; Express sirve `dist` y devuelve `index.html` para rutas que no son `/api`. El arranque falla con un mensaje claro si falta `dist`. Esto no modifica `npm run dev`, que sigue usando Vite y la API local.

## Variables requeridas

- `DATABASE_URL`: URL PostgreSQL remota con `?schema=public`; nunca `file:` ni SQLite.
- `SESSION_SECRET`: secreto aleatorio de al menos 32 caracteres.
- `FRONTEND_ORIGINS`: uno o varios origenes HTTPS exactos separados por comas; no admite comodines.
- `COOKIE_SECURE=true` y `COOKIE_SAME_SITE=lax` o `strict` para HTTPS publico.
- `TRUST_PROXY=true` detras de un proxy/reverse proxy confiable; declaralo explicitamente incluso si es `false` en un host sin proxy.
- `UPLOAD_DIR`: ruta montada como persistente, por ejemplo `/app/uploads/products`.
- `SERVE_STATIC_FRONTEND`: `false` para frontend separado; `true` para el modo unificado.
- `MAX_UPLOAD_MB`: limite de imagenes, por defecto `2`.

Usa [.env.preproduction.example](../.env.preproduction.example) y [.env.production.example](../.env.production.example) solo como inventario de variables. Los proveedores deben guardar los valores reales en su gestor de secretos. Para una preproduccion publica controlada usa `STAGING_ENVIRONMENT=true` y `PREPRODUCTION_ENVIRONMENT=true`; produccion real conserva ambas en `false`.

## Procedimiento general

1. Crea PostgreSQL administrado y un volumen persistente para `UPLOAD_DIR`.
2. Configura las variables seguras, dominio temporal, HTTPS y `TRUST_PROXY`.
3. Genera el cliente y aplica migraciones: `npm run prisma:generate:postgres` y `npm run prisma:migrate:deploy:postgres`. Usa solamente `migrate deploy`; no uses `db push`, `migrate dev` ni `reset`.
4. Construye y publica: `npm run build` para frontend separado, o `docker build -t tic-toc-pharma .` para el modo unificado.
5. Crea el primer administrador real con `npm run bootstrap:admin`. El script usa PostgreSQL, solicita confirmacion y no imprime la contrasena.
6. Inicia la API y verifica `GET /api/health` y `GET /api/ready`. El segundo valida base y directorio de uploads sin exponer secretos.
7. Ejecuta `npm run preprod:check` con la configuracion de preproduccion. Define `PREPROD_CHECK_API_URL` si la API ya es accesible para que tambien consulte ambos endpoints.
8. Prueba login, pedido, imagen protegida, upload y reportes. Completa [PREPRODUCTION_CHECKLIST.md](PREPRODUCTION_CHECKLIST.md).

No ejecutes el seed demo en un entorno publico. `npm run seed:safe` solo permite SQLite de desarrollo o PostgreSQL de staging local controlado.

## Docker y Compose

El `Dockerfile` usa una version LTS de Node, instala desde `package-lock.json`, genera Prisma para PostgreSQL, construye Vite y no copia `.env`, bases, backups ni uploads. Arranca con `node server/index.js` y expone el puerto `4000`.

`docker-compose.preproduction.example.yml` es una guia para ensayar el contenedor. Su servicio `app` monta un volumen nombrado para uploads. PostgreSQL esta bajo el perfil opcional `local-postgres`; para un proveedor real se usa PostgreSQL administrado externo. No se ejecuta seed, reset ni migracion automaticamente.

## Notas por plataforma

- Render/Railway: usa el Dockerfile o configura build `npm ci && npm run build && npm run prisma:generate:postgres`, start `node server/index.js`, PostgreSQL administrado y disco persistente. Ejecuta `migrate deploy` como pre-deploy/release command separado.
- Fly.io: monta un volume para `UPLOAD_DIR`, configura secretos con su CLI y habilita el health check `/api/ready`. PostgreSQL debe ser administrado o un cluster independiente respaldado.
- VPS: usa un reverse proxy (Caddy/Nginx) para HTTPS, configura `TRUST_PROXY=true`, limita acceso a PostgreSQL y monta el directorio de uploads fuera de la imagen.

En todos los casos, confirma el dominio HTTPS exacto en `FRONTEND_ORIGINS`; no uses `*` ni URL de localhost en un entorno publico.

## Rollback

Antes de migrar o importar masivamente, crea y verifica un backup de PostgreSQL y uploads siguiendo [BACKUPS.md](BACKUPS.md). Para volver la aplicacion, publica el commit o imagen anterior y conserva las variables compatibles. Si una migracion falla, detente: no corrijas con `db push`, `migrate dev` o `reset`. Restaura la base solo en una ventana aprobada y desde un backup comprobado, preferentemente ensayado primero en una base aislada.
