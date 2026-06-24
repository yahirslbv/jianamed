# Backups y restauración

Respalda la base de datos, `server/uploads`, las migraciones versionadas y el almacén seguro de variables de entorno. Nunca subas `.env`, `server/prisma/dev.db`, `server/uploads`, `backups/` ni logs a Git.

## PostgreSQL

Un backup diario y otro antes de cada migración o importación masiva es el mínimo recomendado.

```powershell
pg_dump --format=custom --no-owner --file "C:\backups\tictocpharma-$(Get-Date -Format yyyy-MM-dd-HHmm).dump" "$env:DATABASE_URL"
```

Restaura primero en una base vacía de prueba:

```powershell
pg_restore --dbname "postgresql://usuario:password@localhost:5432/tictocpharma_restore?schema=public" --no-owner "C:\backups\tictocpharma-2026-06-23-0100.dump"
```

No agregues `--clean` a una restauración sin una ventana aprobada y un backup recién verificado. Después de restaurar, valida conteos, login, pedido de prueba, reporte y acceso a una imagen protegida.

## SQLite local

Para desarrollo: `npm run db:backup:local`.

Para reemplazar la copia local de forma deliberada: `npm run db:restore:local -- --from <archivo.db> --confirm`. El comando está bloqueado en producción y exige confirmación explícita.

## Uploads

Haz una copia consistente de `server/uploads` junto con la base. En producción usa volumen persistente u object storage con retención y respaldo independientes; el disco efímero de un contenedor no es suficiente.

## Rutina de restauración

- Ensaya restauración al menos trimestralmente y antes de una actualización mayor.
- Registra fecha, backup usado, responsable y resultado.
- Comprueba que el backup se pueda abrir, no solo que el comando termine sin error.
- Conserva una política de retención acorde con requisitos legales y contractuales.
