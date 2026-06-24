# Uploads y almacenamiento persistente

Las imagenes de producto son JPG, JPEG, PNG o WEBP, tienen nombre aleatorio seguro, respetan `MAX_UPLOAD_MB` (2 MB por defecto) y se sirven solamente a sesiones autenticadas por `/api/uploads/products/:filename`.

## Rutas por entorno

- Desarrollo local: si no se define `UPLOAD_DIR`, se usa `server/uploads/products`.
- Staging local: puede usar `server/uploads/products` o una ruta local declarada en `.env.staging`.
- Preproduccion y produccion: define `UPLOAD_DIR=/app/uploads/products` (o una ruta equivalente) y monta esa ruta en un volumen persistente.

La API crea la carpeta si falta y `/api/ready` junto con `npm run preprod:check` comprueban escritura mediante un archivo temporal. Que el directorio exista dentro de la imagen no basta: un contenedor sin volumen pierde sus uploads cuando se reemplaza.

## Backup y restauracion

Haz backup de uploads al mismo tiempo que PostgreSQL y registra ambos artefactos como un conjunto. Por ejemplo, desde el host:

```powershell
Compress-Archive -Path "$env:UPLOAD_DIR\*" -DestinationPath "C:\backups\uploads-$(Get-Date -Format yyyy-MM-dd-HHmm).zip"
```

Para restaurar, detiene escrituras, restaura primero la base en un entorno aislado y despues extrae los uploads en el volumen configurado. Verifica una imagen protegida con una sesion valida antes de reabrir el servicio. Las instrucciones de base estan en [BACKUPS.md](BACKUPS.md).

No subas `uploads/`, `server/uploads/products/*` ni archivos de cliente a Git. El repositorio conserva solamente `.gitkeep` para la ruta local. Si un proveedor no ofrece disco persistente, la siguiente evolucion es migrar a S3, Cloudinary o Supabase Storage y guardar solo URLs/identificadores en PostgreSQL.
