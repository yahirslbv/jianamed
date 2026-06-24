# Migración SQLite a PostgreSQL

## Alcance y seguridad

El historial SQLite existente no debe aplicarse sobre PostgreSQL. El destino usa `server/prisma/postgresql/migrations`, que inicia una base PostgreSQL limpia con enums, índices, restricciones y columnas monetarias en centavos.

No ejecutes `prisma migrate dev` en producción. No uses `prisma db push` para sustituir migraciones. Antes de cualquier conversión, conserva una copia verificable de SQLite y de `server/uploads`.

## Migración de una instalación de desarrollo

1. Detén escrituras y crea el respaldo local: `npm run db:backup:local`.
2. Crea una base PostgreSQL vacía; no reutilices una base de otra aplicación.
3. Define `DATABASE_URL` con la URL PostgreSQL segura.
4. Ejecuta `npm run prisma:generate:postgres`.
5. Ejecuta `npm run prisma:migrate:deploy:postgres`.
6. Para validar una instalación PostgreSQL vacía, ejecuta `npm run prisma:seed:postgres` y prueba login, catálogo, pedido, sesión y reportes.

Para datos reales, realiza una conversión ensayada en un clon del respaldo. Exporta las entidades en el orden `User`, `Customer`, `Laboratory`, `Category`, `Product`, `Offer`, `InventoryLot`, `Order`, `OrderItem`, `AuditLog`; conserva IDs y fechas, transforma roles a mayúsculas (`CLIENT`, `ADMIN`, `SALES`, `SUPERVISOR`) y verifica que todos los valores monetarios estén en centavos enteros. Migra `Session` solo si se acepta invalidar sesiones; normalmente es más seguro empezar sesiones nuevas.

El importador CSV de productos no es un sustituto de esa conversión histórica: sirve para catálogo validado y crea/actualiza productos dentro de una transacción.

## Validación antes del corte

- Conteo de registros por entidad entre origen y destino.
- SKU, correo, folio y lotes únicos sin colisiones.
- Sin precios, créditos, descuentos, stock o cantidades negativos.
- Para cada pedido: `totalCents = subtotalCents - discountTotalCents` y cada snapshot de artículo es consistente.
- Prueba de login de administrador, cliente autorizado, cliente no autorizado e inactivo.
- Prueba de restauración de backup PostgreSQL y de lectura de uploads.

Solo tras estas verificaciones se actualiza `DATABASE_URL` en producción y se reinician las instancias. Mantén SQLite como respaldo de solo lectura hasta aprobar el corte.
