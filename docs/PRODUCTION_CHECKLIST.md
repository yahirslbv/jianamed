# Checklist de producción

- [ ] `DATABASE_URL` apunta a PostgreSQL, nunca a SQLite.
- [ ] Se ejecutaron `npm run prisma:generate:postgres` y `npm run prisma:migrate:deploy:postgres`.
- [ ] `NODE_ENV=production`, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=lax` (o `strict` si el flujo lo permite) y `SESSION_SECRET` largo, aleatorio y secreto.
- [ ] `FRONTEND_ORIGINS` contiene únicamente los dominios HTTPS reales; CORS no usa comodines con credenciales.
- [ ] HTTPS está activo y `TRUST_PROXY=true` solo detrás de un proxy confiable.
- [ ] No se usa sesión en memoria; la tabla `Session` está accesible y se limpia periódicamente.
- [ ] Backups de PostgreSQL y uploads están programados, retenidos y se probó una restauración.
- [ ] `server/uploads` usa almacenamiento persistente fuera de Git.
- [ ] Se ejecutó `npm run build`; se revisaron logs de arranque y auditoría.
- [ ] Usuarios demo y sus contraseñas fueron eliminados o cambiados; no se ejecuta seed demo en producción.
- [ ] Las cuentas administrativas, clientes autorizados y permisos se revisaron manualmente.
- [ ] Se verificó que `passwordHash`, tokens de sesión, `.env`, bases SQLite y uploads no se exponen en respuestas ni en Git.
- [ ] Se validaron login, catálogo, oferta, pedido, reportes CSV/PDF, auditoría e importación transaccional en staging.
