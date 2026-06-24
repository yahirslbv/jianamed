# Tic Toc Pharma

Catálogo B2B farmacéutico con React/Vite, Express y Prisma.

## Desarrollo local

```powershell
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

El desarrollo usa SQLite. Usuarios demo: `admin@demo.com / admin123`, `cliente@demo.com / demo123`, `pendiente@demo.com / demo123` e `inactivo@demo.com / demo123`. No uses estas credenciales fuera de desarrollo.

## PostgreSQL y producción

PostgreSQL es el destino de producción. Define `DATABASE_URL=postgresql://usuario:password@localhost:5432/tictocpharma?schema=public`, después ejecuta:

```powershell
npm run prisma:generate:postgres
npm run prisma:migrate:deploy:postgres
npm run build
```

No ejecutes el seed demo en producción. Consulta [DATABASE.md](docs/DATABASE.md), [DATABASE_MIGRATION.md](docs/DATABASE_MIGRATION.md), [BACKUPS.md](docs/BACKUPS.md) y [PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) antes del despliegue.

Nunca subas `.env`, la base `dev.db`, uploads, logs o backups al repositorio.
