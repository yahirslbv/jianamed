# Migracion SQLite a PostgreSQL

## Alcance y seguridad

SQLite es solo para desarrollo local. PostgreSQL es el destino de produccion y usa el esquema y las migraciones de `server/prisma/postgresql`. No apliques el historial SQLite sobre PostgreSQL ni uses `prisma db push` como sustituto de las migraciones.

Antes de cualquier conversion, detiene las escrituras y conserva una copia verificable de SQLite y de los uploads. No ejecutes `prisma migrate dev` en produccion.

El esquema PostgreSQL incluye enums de rol, relaciones con `ON DELETE RESTRICT` cuando existe historial, snapshots de pedido, folios persistentes, dinero en enteros de centavos e indices para las consultas operativas. La migracion `20260623180000_add_user_role_active_index` mejora la consulta de cuentas internas y la validacion del ultimo administrador activo.

## Preparar una base PostgreSQL limpia

1. Crea una base PostgreSQL vacia y define `DATABASE_URL` con una URL segura.
2. Define `NODE_ENV=production`, `COOKIE_SECURE=true`, `FRONTEND_ORIGINS` HTTPS y un `SESSION_SECRET` real.
3. Ejecuta `npm run prisma:generate:postgres`.
4. Ejecuta `npm run prisma:migrate:deploy:postgres`.
5. Solo para una base de prueba vacia, ejecuta `npm run prisma:seed:postgres`.
6. Prueba login, catalogo, clientes, cuentas internas, pedido, sesion y reportes antes del corte.

No ejecutes el seed demo sobre una base productiva. Crea el primer administrador real mediante una operacion controlada antes de abrir el sistema.

## Conversion de datos reales

Ensaya la conversion en un clon del respaldo. Exporta en este orden: `User`, `Customer`, `Laboratory`, `Category`, `Product`, `Offer`, `InventoryLot`, `Order`, `OrderItem`, `AuditLog`. Conserva IDs y fechas, y convierte roles a mayusculas: `CLIENT`, `ADMIN`, `SALES`, `SUPERVISOR`.

`Customer` y cuentas internas son entidades distintas: todo usuario con `Customer` debe conservar `CLIENT`; ADMIN, SALES y SUPERVISOR no deben recibir un `Customer`. Normalmente es mas seguro no migrar `Session` y forzar nuevas sesiones despues del corte.

Todos los montos deben convertirse y verificarse como centavos enteros: precio, credito, descuento, subtotal y total. El importador CSV no reemplaza esta conversion historica; solo importa catalogo validado.

## Validacion antes del corte

- Conteo de registros por entidad entre origen y destino.
- Correo, SKU, folio y lote unicos sin colisiones.
- Indices presentes para `User(role,isActive)`, Customer, Product, Order, Session, ImportBatch y AuditLog.
- Sin precios, creditos, descuentos, stock o cantidades negativos.
- Por pedido: `totalCents = subtotalCents - discountTotalCents`; snapshots de articulos consistentes.
- Login de administrador, cliente autorizado, cliente no autorizado, cliente inactivo y usuario interno inactivo.
- Restauracion de backup PostgreSQL y lectura de uploads probadas.

Solo tras estas verificaciones se actualiza `DATABASE_URL` de produccion y se reinician las instancias. Mantener SQLite como respaldo de solo lectura hasta aprobar el corte.
