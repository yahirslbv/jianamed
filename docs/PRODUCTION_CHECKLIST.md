# Checklist final de produccion

Este checklist se completa despues de aprobar staging. Staging local puede usar `STAGING_LOCAL=true` y HTTP; produccion nunca puede usar esa excepcion.

## A. Requisitos obligatorios

- [ ] PostgreSQL real, respaldado y sin SQLite en produccion.
- [ ] HTTPS activo, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE` revisado y `TRUST_PROXY` configurado solo detras de proxy confiable.
- [ ] `SESSION_SECRET` fuerte, aleatorio y fuera del repositorio.
- [ ] `FRONTEND_ORIGINS` contiene solo dominios HTTPS reales, sin comodines.
- [ ] `TRUST_PROXY` esta declarado para el reverse proxy y `COOKIE_SAME_SITE` es `lax` o `strict`.
- [ ] Uploads en almacenamiento persistente y backups/restauracion probados.
- [ ] Administrador real creado; usuarios demo eliminados o sus credenciales cambiadas.
- [ ] Seed demo no se ejecuto en produccion.
- [ ] `npm run prisma:migrate:deploy:postgres` aplicado y `npm run preprod:check` aprobado.
- [ ] `/api/health` y `/api/ready` devuelven estado correcto sin secretos.
- [ ] Auditoria, rate limit de login, Helmet y validacion Origin/Referer para mutaciones validados.
- [ ] No existen `.env`, SQLite, backups, uploads o logs en Git.

## B. Pruebas funcionales

- [ ] Login, logout, sesion persistente y usuario inactivo.
- [ ] Usuarios internos y clientes autorizados.
- [ ] Catalogo, imagenes protegidas, productos y ofertas.
- [ ] Carrito, checkout, pedidos, stock y folios.
- [ ] Pedidos administrativos, reportes CSV/PDF e importacion transaccional.
- [ ] Auditoria y modo oscuro/responsive basico.
- [ ] Restauracion de backup de PostgreSQL y uploads en ambiente aislado.
- [ ] Imagenes protegidas siguen accesibles despues de restaurar uploads.

## C. Pendientes antes de produccion real

- [ ] Decidir si `forcePasswordChange` es obligatorio e implementarlo si aplica.
- [ ] Definir recuperacion de contrasena, retencion de auditoria y monitoreo/alertas.
- [ ] Confirmar almacenamiento externo de imagenes si el hosting no conserva disco.
- [ ] Definir store compartido para rate limiting si se ejecutaran multiples instancias.
- [ ] Documentar responsable, ventana de despliegue y plan de reversa.
- [ ] Evaluar token CSRF por sesion/double-submit si se integran clientes distintos al frontend controlado; la proteccion actual valida Origin/Referer.
