# Base de datos

## Decisión de motor

SQLite permanece para desarrollo local. PostgreSQL es el motor formal de producción para Tic Toc Pharma. No se debe desplegar SQLite ni sesiones en memoria a producción.

Hay dos esquemas Prisma intencionales:

- `server/prisma/schema.prisma`: SQLite para desarrollo y pruebas locales.
- `server/prisma/postgresql/schema.prisma`: PostgreSQL para producción, con enums nativos y migraciones propias.

No se mezclan sus directorios de migración: Prisma bloquea cada historial por proveedor. Antes de arrancar el servidor se genera el cliente del entorno que se va a ejecutar.

## Dinero

Todos los importes se guardan como enteros en centavos MXN (`priceCents`, `totalCents`, etc.). No hay columnas monetarias `Float` ni conversiones de punto flotante durante los cálculos. Por ejemplo, `10.99` se persiste como `1099`.

`server/utils/money.js` es la única fuente de cálculo del backend. El frontend convierte a centavos para totales del carrito y solamente convierte a número decimal al renderizar. Las respuestas API conservan el contrato de precio decimal para no romper la UI, pero los snapshots y cálculos persistidos son enteros.

Los porcentajes se guardan en puntos base: `10%` = `1000`. Los descuentos nunca producen precios negativos.

## Desarrollo local con SQLite

1. Copia `server/.env.example` a `server/.env` y conserva `DATABASE_URL="file:./dev.db"` en `server/prisma/.env`.
2. Ejecuta `npm install`.
3. Ejecuta `npm run prisma:generate`.
4. Ejecuta `npm run prisma:migrate`.
5. Ejecuta `npm run prisma:seed`.
6. Ejecuta `npm run dev`.

`npm run db:backup:local` crea una copia fechada en `backups/`. Esa carpeta está ignorada por Git. Para una restauración local explícita: `npm run db:restore:local -- --from backups/dev-<fecha>.db --confirm`.

El comando de migración inicializa únicamente el archivo SQLite local si aún no existe; no ejecuta `reset` ni borra una base existente.

## PostgreSQL local o de producción

1. Crea una base vacía y un usuario de aplicación con permisos mínimos sobre esa base.
2. Configura solo en el entorno seguro:

   ```text
   DATABASE_URL=postgresql://usuario:password@localhost:5432/tictocpharma?schema=public
   ```

3. Genera el cliente PostgreSQL: `npm run prisma:generate:postgres`.
4. Aplica el historial: `npm run prisma:migrate:deploy:postgres`.
5. Solo para una base de desarrollo PostgreSQL vacía, ejecuta `npm run prisma:seed:postgres`. Nunca siembra usuarios demo en producción.

Al volver a SQLite, ejecuta `npm run prisma:generate:sqlite` antes de iniciar el servidor local. Este paso es necesario porque Prisma genera un cliente por proveedor.

MySQL es una alternativa secundaria viable con la misma estrategia de centavos, pero no tiene migraciones mantenidas en este repositorio y no es un destino soportado de despliegue.

## Persistencia operativa

- Las sesiones se guardan en `Session` como hash SHA-256 del token aleatorio de cookie, nunca como token en texto plano. La cookie sigue siendo `HttpOnly`.
- Las vistas previas de CSV se guardan temporalmente en `ImportBatch`; el archivo no queda guardado. La confirmación usa una transacción, expira a los 15 minutos y su payload se limpia al expirar.
- `User.isActive` es la única fuente de verdad para bloquear el inicio de sesión. `Customer.isAuthorized` controla si un cliente activo puede crear pedidos.
- Productos, clientes, usuarios y ofertas se desactivan lógicamente. Las relaciones de pedidos usan `RESTRICT` para conservar historial y los `OrderItem` mantienen snapshots.
