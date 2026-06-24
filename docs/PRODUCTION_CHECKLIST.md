# Checklist de produccion

## Entorno y despliegue

- [ ] `NODE_ENV=production`.
- [ ] `DATABASE_URL` apunta a PostgreSQL, nunca a SQLite.
- [ ] `SESSION_SECRET` es aleatorio, privado y tiene al menos 32 caracteres.
- [ ] `COOKIE_SECURE=true` y `COOKIE_SAME_SITE=lax` (o `strict` si el flujo lo permite).
- [ ] `FRONTEND_ORIGINS` contiene solamente dominios HTTPS reales, sin comodines.
- [ ] `TRUST_PROXY=true` solo detras de un proxy confiable.
- [ ] Se definio `LOGIN_RATE_LIMIT_MAX` apropiado para el trafico esperado.
- [ ] Se ejecutaron `npm run prisma:generate:postgres` y `npm run prisma:migrate:deploy:postgres`.
- [ ] Se ejecuto `npm run build` y se revisaron los logs de arranque.

## Seguridad

- [ ] HTTPS esta activo de extremo a extremo.
- [ ] Helmet esta habilitado; se revisaron sus headers en staging.
- [ ] Login esta limitado por IP (15 minutos; exitos no consumen el limite). Para multiples instancias, reemplazar el almacenamiento en memoria de `express-rate-limit` por Redis u otro store compartido.
- [ ] Las mutaciones con cookie verifican `Origin` contra `FRONTEND_ORIGINS`; esto es la proteccion CSRF actual junto con SameSite. No hay token CSRF separado todavia.
- [ ] No se registran contrasenas, `passwordHash`, cookies, tokens de sesion ni contenido completo de imports.
- [ ] `passwordHash`, tokens de sesion, `.env`, SQLite y uploads no aparecen en respuestas ni en Git.
- [ ] `server/uploads` usa almacenamiento persistente fuera de Git.

## Cuentas y permisos

- [ ] Crear un admin real.
- [ ] Desactivar o cambiar credenciales demo; no ejecutar seed demo en produccion.
- [ ] Revisar usuarios internos en `#/admin/usuarios`.
- [ ] Revisar clientes autorizados en `#/admin/clientes`.
- [ ] Revisar la matriz en `ROLES_AND_PERMISSIONS.md`.
- [ ] Probar login con admin, cliente autorizado, cliente no autorizado e inactivo.
- [ ] Probar que un usuario inactivo no puede iniciar sesion.
- [ ] Probar que cliente no autorizado no puede crear pedido.
- [ ] Probar que solo ADMIN puede crear cuentas internas.
- [ ] Probar creacion, cambio de rol, restablecimiento de contrasena y desactivacion de ADMIN/SALES/SUPERVISOR.
- [ ] Probar que no se puede desactivar la propia cuenta ADMIN ni quitar el ultimo ADMIN activo.

## Datos y operacion

- [ ] La tabla `Session` esta accesible y se limpia periodicamente.
- [ ] Probar PostgreSQL en staging con una base limpia.
- [ ] Programar y probar backups y restauracion de PostgreSQL y uploads.
- [ ] Validar catalogo, ofertas, carrito, checkout, pedidos, reportes CSV/PDF, auditoria e importacion en staging.
- [ ] Confirmar que precios, descuentos, creditos y totales usan centavos enteros y los serializers/reportes los presentan correctamente.
