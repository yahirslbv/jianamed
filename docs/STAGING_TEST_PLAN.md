# Plan de pruebas de staging

Ejecuta este plan solo despues de `npm run staging:check` y en una instancia PostgreSQL de staging aislada. Registra fecha, responsable, commit y resultado de cada caso. El smoke test cubre una parte del API; la lista siguiente completa la validacion manual.

## Preparacion

- [ ] PostgreSQL healthy, migraciones aplicadas y seed demo usado solamente sobre una base vacia.
- [ ] API iniciado con `npm run staging:server`; Vite consume esa API.
- [ ] `npm run staging:smoke` termina correctamente.
- [ ] No se usaron secretos, uploads ni datos reales.

## Autenticacion y sesiones

- [ ] Login admin correcto y credenciales incorrectas rechazadas con mensaje generico.
- [ ] Rate limit bloquea intentos repetidos y logout revoca la sesion.
- [ ] Existe una fila en `Session`; restablecer contrasena revoca sesiones anteriores.
- [ ] Usuario inactivo no puede iniciar sesion.

## Cuentas internas y clientes

- [ ] ADMIN abre `#/admin/usuarios`, crea ADMIN, SALES y SUPERVISOR, edita, cambia rol, restablece contrasena y activa/desactiva.
- [ ] La API rechaza `CLIENT` en cuentas internas y no permite desactivar el ultimo ADMIN activo.
- [ ] AuditLog contiene `CREATE_USER`, `UPDATE_USER`, `ROLE_CHANGE_USER`, `STATUS_CHANGE_USER` y `PASSWORD_RESET_USER`.
- [ ] ADMIN abre `#/admin/clientes`, crea y edita clientes autorizados/no autorizados, y cambia autorizacion.
- [ ] Cliente autorizado puede crear pedido; cliente no autorizado no puede; cliente inactivo no inicia sesion.

## Catalogo, productos y ofertas

- [ ] Catalogo, busqueda, filtros y catalogos por laboratorio funcionan.
- [ ] Imagen protegida devuelve 401 sin sesion y 200 con sesion.
- [ ] ADMIN crea, edita, activa/desactiva producto y sube imagen; SKU unico y `priceCents` son correctos.
- [ ] Ofertas por producto, laboratorio, categoria y tipo aplican el descuento correcto, nunca generan precio negativo y muestran precio original/final.
- [ ] Carrito conserva descuentos, cantidades y precios aplicados.

## Checkout, pedidos y administracion

- [ ] Checkout crea pedido con folio; descuenta stock y conserva snapshots de precio, descuento, laboratorio y presentacion.
- [ ] Cancelacion permitida repone stock si el pedido sigue pendiente.
- [ ] ADMIN ve, filtra y cambia estado de pedidos; la auditoria registra el cambio.

## Reportes e importacion

- [ ] Reportes de pedidos, productos, inventario, ofertas y clientes se generan en CSV y PDF.
- [ ] Auditoria registra `EXPORT_CSV` y `EXPORT_PDF`; las exportaciones no incluyen hashes ni tokens.
- [ ] Plantilla CSV descarga, preview marca errores y una importacion valida se confirma en transaccion.
- [ ] ImportBatch refleja el resultado; no quedan datos parciales despues de un error critico.

## UI y salida de staging

- [ ] Modo oscuro, Mi cuenta y menu administrativo funcionan.
- [ ] En movil no hay overflow horizontal no controlado; tablas usan desplazamiento contenido cuando es necesario.
- [ ] Se probaron backup y restauracion de PostgreSQL y uploads en una base de prueba.
- [ ] Se reviso [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) y se documentaron pendientes antes de produccion.
