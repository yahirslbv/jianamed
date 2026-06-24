# Migracion SQLite a PostgreSQL

SQLite se conserva para desarrollo local. PostgreSQL es el destino para staging y produccion, usando exclusivamente `server/prisma/postgresql/schema.prisma` y sus migraciones. No apliques el historial SQLite sobre PostgreSQL, no uses `prisma db push` y nunca ejecutes `prisma migrate dev` en produccion.

## Staging reproducible

La primera validacion debe ocurrir con el flujo documentado en [STAGING.md](STAGING.md): Docker Compose local, `.env.staging` ignorado, `prisma:migrate:deploy:postgres`, seed protegido para base vacia y `staging:check`.

El staging local HTTP usa `NODE_ENV=production`, `STAGING_ENVIRONMENT=true`, `STAGING_LOCAL=true` y `COOKIE_SECURE=false`. Esta es una excepcion limitada para `localhost`; staging publico y produccion deben usar HTTPS, `COOKIE_SECURE=true`, dominios HTTPS explicitos y `STAGING_LOCAL` ausente o `false`.

## Conversion de datos reales

Antes de una conversion, detiene escrituras y conserva una copia verificable de SQLite y uploads. Ensaya siempre en un clon del respaldo. Exporta en este orden: `User`, `Customer`, `Laboratory`, `Category`, `Product`, `Offer`, `InventoryLot`, `Order`, `OrderItem`, `AuditLog`.

Conserva IDs y fechas, convierte roles a `CLIENT`, `ADMIN`, `SALES` o `SUPERVISOR`, y no asignes `Customer` a cuentas internas. En general es mas seguro iniciar sesiones nuevas que migrar `Session`.

Todos los montos se validan como enteros de centavos: precio, credito, descuento, subtotal y total. Mantiene snapshots de pedidos, folios persistentes y relaciones `RESTRICT` cuando existe historial. El importador CSV no reemplaza una conversion historica.

## Validacion antes del corte

- Conteos de entidades entre origen y destino.
- Correo, SKU, folio y lote unicos sin colisiones.
- Migraciones, tablas, enums e indices validados por `npm run staging:check`.
- Sin precios, creditos, descuentos, stock o cantidades negativos.
- Para cada pedido: `totalCents = subtotalCents - discountTotalCents` y snapshots consistentes.
- Login de admin, cliente autorizado/no autorizado/inactivo y usuarios internos.
- Restauracion de PostgreSQL y lectura de uploads ensayadas.

Solo despues de aprobar staging se actualiza el `DATABASE_URL` de produccion, se aplica `prisma migrate deploy` y se reinician instancias dentro de una ventana aprobada. Nunca ejecutes el seed demo en produccion; crea el primer administrador real mediante una operacion controlada.
