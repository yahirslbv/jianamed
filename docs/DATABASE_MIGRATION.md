# Migración de base de datos

## Estado actual

El desarrollo local usa SQLite mediante `server/prisma/schema.prisma` y `server/prisma/dev.db`. Los importes se almacenan como enteros en centavos para evitar errores de punto flotante y conservar compatibilidad con SQLite.

Para producción se recomienda PostgreSQL. No se cambia el proveedor actual automáticamente: así el equipo puede seguir desarrollando sin instalar un servicio adicional ni mezclar datos locales con los de producción.

## Desarrollo local

1. Copia la configuración de entorno requerida y define `DATABASE_URL="file:./dev.db"` dentro de `server/prisma/.env`.
2. Ejecuta `npm install`.
3. Ejecuta `npm run prisma:generate`.
4. Ejecuta `npm run prisma:migrate`.
5. Ejecuta `npm run prisma:seed`.
6. Ejecuta `npm run dev`.

## Preparar PostgreSQL

1. Crea una base de datos vacía y un usuario con permisos limitados.
2. Guarda la URL únicamente en el entorno de despliegue, por ejemplo:

   `DATABASE_URL="postgresql://usuario:password@localhost:5432/tictocpharma?schema=public"`

3. En una rama o configuración específica para producción, cambia el `provider` de Prisma a `postgresql` y revisa/genera las migraciones para esa base. Los campos monetarios permanecen como `Int` en centavos; no requieren tipos Decimal nativos.
4. Ejecuta `npm run prisma:generate` y `npm run prisma:migrate:deploy` en el entorno destino.
5. Migra los datos con respaldo y una prueba previa. Nunca apuntes un `migrate dev` de SQLite a producción.

PostgreSQL es el objetivo principal. MySQL es viable con el mismo modelo de centavos, pero debe tener su propia revisión de migraciones y respaldo antes de adoptarlo.

## Antes de producción

- No subas `.env`, `dev.db` ni `server/uploads/` al repositorio.
- Haz backup verificable antes de cualquier migración.
- Las sesiones actuales están en memoria: muévelas a una base persistente o Redis.
- Los uploads locales sirven para desarrollo; usa almacenamiento persistente con backups en producción.
- Configura logs, CORS, `COOKIE_SECURE`, `COOKIE_SAME_SITE` y `FRONTEND_ORIGINS` para el dominio real.
- Programa backups, prueba restauraciones y limita el acceso de la cuenta de base de datos.
- Solicitar al cliente una imagen oficial del logo en PNG/SVG de buena calidad, preferentemente fondo transparente.
