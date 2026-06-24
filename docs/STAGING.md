# PostgreSQL staging local

Este flujo crea una instancia PostgreSQL local de staging. No despliega produccion, no modifica SQLite local y no debe usarse con secretos ni datos reales.

## Requisitos

- Docker Desktop con Docker Compose v2.
- Node.js y dependencias instaladas con `npm install`.
- Puerto `5432` disponible, o `POSTGRES_PORT` definido para Docker Compose.

## Preparacion

1. Copia `.env.staging.example` como `.env.staging` en la raiz del proyecto.
2. Reemplaza `SESSION_SECRET` por un valor aleatorio de al menos 32 caracteres.
3. Conserva `STAGING_ENVIRONMENT=true`. Esta marca protege los scripts de staging contra ejecuciones accidentales.
4. Para este staging local HTTP conserva `STAGING_LOCAL=true` y `COOKIE_SECURE=false`. Nunca uses esa combinacion en staging publico o produccion; alli se requiere HTTPS y `COOKIE_SECURE=true`. La plantilla tambien declara `UPLOAD_DIR`, `MAX_UPLOAD_MB` y `SERVE_STATIC_FRONTEND=false`.

`.env.staging` esta ignorado por Git. Tambien puedes definir las mismas variables temporalmente en la terminal para CI o una ejecucion puntual.

## Levantar, migrar y sembrar

```powershell
npm run postgres:up
npm run prisma:generate:postgres
npm run prisma:migrate:deploy:postgres
npm run prisma:seed:postgres
npm run staging:check
```

`postgres:up` inicia `postgres:16-alpine` con la base `tictocpharma_staging` y un volumen Docker nombrado persistente. Comprueba el estado con:

```powershell
docker compose -f docker-compose.postgres.yml ps
npm run postgres:logs
```

El script `prisma:seed:postgres` genera el cliente PostgreSQL y rechaza una base que ya tenga Users, Customers, catalogo, ofertas o pedidos. El seed demo es exclusivo para una base de staging local vacia; `npm run seed:safe` aplica la misma politica. Nunca debe ejecutarse en preproduccion publica ni produccion real.

`staging:check` comprueba configuracion, conexion, migraciones, tablas, enums, indices e integridad de columnas monetarias en centavos. No usa `prisma db push`.

## Ejecutar API y smoke test

En una terminal inicia el API contra PostgreSQL:

```powershell
npm run staging:server
```

En otra terminal inicia Vite como de costumbre con `npm run dev`; el proxy local apunta a `http://127.0.0.1:4000`. Despues ejecuta:

```powershell
npm run staging:smoke
```

El smoke test verifica health, login de administrador demo, sesion, productos, usuarios internos, clientes, pedidos, reporte de productos y logout. No imprime cookies ni tokens. Por seguridad solo permite destinos locales a menos que se declare `STAGING_SMOKE_ALLOW_REMOTE=true` para un staging remoto controlado.

Credenciales demo de staging: `admin@demo.com / admin123`, `cliente@demo.com / demo123`, `pendiente@demo.com / demo123`, `inactivo@demo.com / demo123`, `ventas@demo.com / internal123` y `supervisor@demo.com / internal123`.

## Detener staging y volver a SQLite

```powershell
npm run postgres:down
npm run prisma:generate
```

`postgres:down` conserva el volumen local para no borrar datos por accidente. No existe un script de reset deliberadamente. Para reiniciar una base de staging se requiere una confirmacion humana, un backup verificable y una accion manual fuera de los scripts normales.

El ultimo comando vuelve a generar el cliente Prisma para SQLite; los scripts locales `prisma:migrate`, `prisma:seed` y `npm run dev` siguen usando `server/prisma/schema.prisma` y el `.env` local.
