# Backups y restauracion

Nunca guardes `.env`, bases, backups, uploads o logs en Git. Haz backup antes de cada migracion o importacion masiva; como minimo, realiza un backup diario y ensaya restauracion trimestralmente.

## PostgreSQL

Genera un dump custom para restauraciones controladas:

```powershell
pg_dump --format=custom --no-owner --file "C:\backups\tictocpharma-$(Get-Date -Format yyyy-MM-dd-HHmm).dump" "$env:DATABASE_URL"
```

Restaura primero en una base vacia de prueba:

```powershell
pg_restore --dbname "postgresql://usuario:password@localhost:5432/tictocpharma_restore?schema=public" --no-owner "C:\backups\tictocpharma-2026-06-23-0100.dump"
```

Para un backup SQL plano, usa `pg_dump --format=plain` y restaura con:

```powershell
psql "postgresql://usuario:password@localhost:5432/tictocpharma_restore?schema=public" -f "C:\backups\tictocpharma.sql"
```

No agregues `--clean` sin una ventana aprobada y un backup reciente verificado. Despues de restaurar, valida conteos, login, pedido de prueba, reportes e imagen protegida.

## Uploads

Mantiene una copia consistente de `server/uploads` junto con la base:

```powershell
Compress-Archive -Path server\uploads\* -DestinationPath "C:\backups\uploads-$(Get-Date -Format yyyy-MM-dd-HHmm).zip"
```

En sistemas Unix puede usarse `tar -czf uploads-YYYY-MM-DD.tar.gz server/uploads`. En produccion usa volumen persistente u object storage con retencion independiente; el disco efimero de un contenedor no es suficiente.

## SQLite local

Para desarrollo: `npm run db:backup:local`.

Para restaurar deliberadamente: `npm run db:restore:local -- --from <archivo.db> --confirm`. El comando esta bloqueado en produccion y exige confirmacion explicita.

## Registro de restauraciones

- Guarda fecha, backup usado, responsable y resultado.
- Verifica que el archivo se puede restaurar, no solo que el comando finaliza.
- Define retencion acorde con requisitos legales y contractuales.
