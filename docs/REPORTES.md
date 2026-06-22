# Tic Toc Pharma - Operacion local

## Inicio

Ejecuta el frontend y la API juntos:

```powershell
npm run dev
```

El portal queda disponible en `http://127.0.0.1:5173/` y la API en el puerto `4000`.

## Base de datos

Las migraciones de Prisma y los datos demo se ejecutan con:

```powershell
npm run prisma:generate
npm run prisma:migrate -- --name nombre-del-cambio
npm run prisma:seed
```

El seed actual conserva la estructura local y asegura usuarios, catalogo y ofertas demo.

## Usuarios demo

| Perfil | Correo | Contrasena |
| --- | --- | --- |
| Cliente | `cliente@demo.com` | `demo123` |
| Administrador | `admin@demo.com` | `admin123` |

## Reportes

El administrador dispone de `#/admin/reportes` para consultar y exportar pedidos, productos, inventario, ofertas y clientes.

- `CSV` usa UTF-8, escapa comillas, comas y saltos de linea.
- `PDF` incluye nombre de la distribuidora, usuario administrador, filtros, tabla y total de registros.
- Las exportaciones generan registros `EXPORT_CSV` o `EXPORT_PDF` en `#/admin/auditoria`.
- Los reportes no exponen hashes de contrasena, sesiones ni credenciales.

## Tema

El selector de tema se encuentra en el encabezado. El modo claro es el predeterminado, se respeta la preferencia del sistema cuando no existe una eleccion guardada y la opcion elegida se guarda en `localStorage`.

## Credito virtual

El modelo `Customer` contiene los campos de credito virtual para una etapa posterior. `creditEnabled` inicia desactivado y estos campos no intervienen en el checkout ni habilitan compra a credito.

## Archivos locales

No se versionan la base SQLite, archivos subidos, variables de entorno ni logs de desarrollo:

- `server/prisma/dev.db`
- `server/uploads/products/*`
- `server/.env`
- `server/prisma/.env`
- `*-dev.log`

Los registros QA locales, imagenes de prueba y pedidos mock son datos de desarrollo y no se incluyen en Git.
