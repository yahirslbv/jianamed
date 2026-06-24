# Checklist de preproduccion publica

Completa esta lista antes de promover un build. Preproduccion no usa SQLite ni seed demo.

## Infraestructura

- [ ] PostgreSQL remoto creado, acceso restringido y respaldado.
- [ ] Dominio temporal y HTTPS activos.
- [ ] `FRONTEND_ORIGINS` contiene solamente el/los dominio(s) exactos de HTTPS.
- [ ] `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=lax` o `strict` y `TRUST_PROXY` declarado correctamente.
- [ ] `UPLOAD_DIR` esta montado en volumen persistente y `/api/ready` devuelve `uploads: ok`.
- [ ] Backup de PostgreSQL y uploads creado; restore ensayado en un entorno aislado.

## Base de datos y arranque

- [ ] `npm run prisma:migrate:deploy:postgres` aplicado sin `db push`, `migrate dev` ni reset.
- [ ] Seed demo no ejecutado.
- [ ] `npm run bootstrap:admin` creo un administrador real y se verifico su login.
- [ ] Hay al menos un ADMIN activo; usuarios demo eliminados o inactivos.
- [ ] `REQUIRE_NO_DEMO_USERS=true` y `npm run preprod:check` pasan.
- [ ] `/api/health` devuelve 200 y `/api/ready` devuelve 200 con `database: ok` y `uploads: ok`.

## Seguridad

- [ ] Helmet activo, sin `X-Powered-By`, cookies HttpOnly con expiracion y path correcto.
- [ ] Rate limit de login activo y mensaje de credenciales generico.
- [ ] Las mutaciones validan `Origin` o `Referer` contra `FRONTEND_ORIGINS`; origen ausente se rechaza en produccion.
- [ ] No hay secretos, `.env`, SQLite, backups, logs ni uploads reales en Git.
- [ ] No se exponen `passwordHash`, tokens de sesion, cookies completas ni `DATABASE_URL` en respuestas o logs.

## Flujo funcional

- [ ] Login/logout de administrador, cliente autorizado, cliente no autorizado e inactivo.
- [ ] Usuarios internos, clientes, productos, ofertas y carrito.
- [ ] Checkout, pedido, stock y auditoria.
- [ ] CSV/PDF, importacion transaccional e imagenes protegidas.
- [ ] Smoke test adaptado a cuentas reales o pruebas manuales equivalentes documentadas.
