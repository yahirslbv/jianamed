# Tic Toc Pharma

Catalogo B2B farmaceutico con React/Vite, Express y Prisma. El desarrollo local usa SQLite; PostgreSQL es el unico destino recomendado para produccion.

## Desarrollo local

```powershell
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Usuarios demo locales: `admin@demo.com / admin123`, `cliente@demo.com / demo123`, `pendiente@demo.com / demo123` e `inactivo@demo.com / demo123`. No uses estas credenciales fuera de desarrollo.

## Cuentas internas y clientes B2B

- `#/admin/clientes` administra clientes autorizados B2B. Al crearlos se genera un `User` con rol `CLIENT` y una ficha `Customer`.
- `#/admin/usuarios` administra solamente cuentas internas: `ADMIN`, `SALES` y `SUPERVISOR`.
- Solo ADMIN puede gestionar cuentas internas. SALES y SUPERVISOR se crean para la matriz futura y no reciben permisos administrativos automaticamente.
- Las cuentas se desactivan con `isActive`; no se eliminan fisicamente. Las acciones de administracion se auditan.

Consulta [ROLES_AND_PERMISSIONS.md](docs/ROLES_AND_PERMISSIONS.md) para la matriz actual y propuesta.

## PostgreSQL y produccion

Define una URL PostgreSQL segura en `DATABASE_URL`, configura `NODE_ENV=production`, `SESSION_SECRET`, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE`, `FRONTEND_ORIGINS` HTTPS y `TRUST_PROXY` segun tu infraestructura. Despues ejecuta:

```powershell
npm run prisma:generate:postgres
npm run prisma:migrate:deploy:postgres
npm run build
```

Para una base de staging vacia usa el flujo de [STAGING.md](docs/STAGING.md): `postgres:up`, migraciones, seed protegido y smoke test. Nunca ejecutes el seed demo sobre produccion.

Antes de publicar, revisa [STAGING.md](docs/STAGING.md), [STAGING_TEST_PLAN.md](docs/STAGING_TEST_PLAN.md), [DATABASE.md](docs/DATABASE.md), [DATABASE_MIGRATION.md](docs/DATABASE_MIGRATION.md), [BACKUPS.md](docs/BACKUPS.md) y [PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md).

No subas `.env`, bases SQLite, uploads, logs ni backups al repositorio.
