# Roles y permisos

## Separacion de cuentas

Una cuenta interna representa a una persona que opera Tic Toc Pharma. Solo puede tener el rol `ADMIN`, `SALES` o `SUPERVISOR` y se administra desde `#/admin/usuarios`.

Un cliente autorizado es una cuenta B2B con una ficha comercial, fiscal y regulatoria (`Customer`). Siempre tiene el rol `CLIENT` y se administra exclusivamente desde `#/admin/clientes`. Un cliente puede estar activo pero no autorizado para hacer pedidos; esa autorizacion no se usa para cuentas internas.

No se elimina fisicamente ningun usuario ni cliente. `isActive` conserva el historial, y las relaciones de pedidos usan restricciones para impedir borrar los datos que sustentan un pedido.

## Roles actuales

| Rol | Acceso actual |
| --- | --- |
| `CLIENT` | Catalogo, ofertas, cuenta, sus pedidos y checkout cuando su cliente esta autorizado. |
| `ADMIN` | Acceso administrativo completo: productos, ofertas, clientes, cuentas internas, pedidos, reportes, auditoria e importaciones. |
| `SALES` | Solo inicio de sesion y Mi cuenta por ahora. No obtiene permisos administrativos por defecto. |
| `SUPERVISOR` | Solo inicio de sesion y Mi cuenta por ahora. No obtiene permisos administrativos por defecto. |

Las rutas criticas siguen usando `requireRole('admin')`. `server/permissions.js` concentra los helpers de permisos para introducir permisos mas finos de forma intencional, no accidental.

## Matriz propuesta para una etapa futura

| Capacidad | CLIENT | ADMIN | SALES | SUPERVISOR |
| --- | --- | --- | --- |
| Ver catalogo y ofertas | Si | Si | Por definir | Por definir |
| Crear y ver sus pedidos | Si, autorizado | Si | No | No |
| Gestionar productos y ofertas | No | Si | No | No |
| Ver clientes | Solo su perfil | Si | Propuesto | Propuesto |
| Ver/gestionar pedidos | Solo propios | Si | Propuesto, estados limitados | Propuesto, solo lectura o estados limitados |
| Ver reportes | No | Si | No | Propuesto, solo lectura |
| Ver auditoria | No | Si | No | No |
| Crear o modificar ADMIN | No | Si | Nunca | Nunca |
| Configuracion de produccion | No | Si | No | No |

Antes de habilitar SALES o SUPERVISOR en una ruta se debe definir la accion exacta, agregar la comprobacion en `server/permissions.js`, probarla y actualizar esta matriz.

## Administracion de cuentas internas

Solo un administrador puede crear, editar, cambiar rol, activar/desactivar y restablecer la contrasena de una cuenta interna. `CLIENT` no aparece como opcion ni se acepta por la API de usuarios internos.

La contrasena inicial o temporal debe tener al menos 8 caracteres y como maximo 72 bytes UTF-8, limite compatible con bcrypt. Los restablecimientos revocan las sesiones existentes del usuario. La aplicacion nunca devuelve `passwordHash`, tokens ni hashes de sesion.

Para no dejar el sistema sin administracion, no se puede desactivar la propia cuenta administrativa y tampoco se puede quitar o desactivar el ultimo `ADMIN` activo. Todas las acciones se registran en `AuditLog` con `CREATE_USER`, `UPDATE_USER`, `STATUS_CHANGE_USER`, `ROLE_CHANGE_USER` o `PASSWORD_RESET_USER`.

## Pendiente intencional

`forcePasswordChange` no esta implementado aun. Antes de publicarlo se debera agregar como campo persistente, una pantalla de cambio de contrasena autenticado y una regla que limite la sesion hasta completar el cambio.
