#!/bin/sh
# Backup diario de la base Benechito. Correr en el VPS por cron.
# Requiere: DATABASE_URL (o ajusta las variables PG* abajo) y pg_dump instalado.
# Ejemplo cron (diario 03:00):  0 3 * * * /ruta/scripts/backup-db.sh >> /var/log/benechito-backup.log 2>&1
set -e

DEST="${BACKUP_DIR:-/opt/benechito-backups}"
RETENER_DIAS="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p "$DEST"

STAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVO="$DEST/benechito_$STAMP.sql.gz"

echo "→ Respaldo $STAMP"
# Usa DATABASE_URL si está; si no, arma con PGHOST/PGUSER/PGDATABASE/PGPASSWORD.
if [ -n "$DATABASE_URL" ]; then
  pg_dump "$DATABASE_URL" | gzip > "$ARCHIVO"
else
  pg_dump | gzip > "$ARCHIVO"
fi

echo "→ Guardado en $ARCHIVO"
# Borra respaldos más viejos que N días.
find "$DEST" -name "benechito_*.sql.gz" -mtime +"$RETENER_DIAS" -delete
echo "→ Limpieza de respaldos > $RETENER_DIAS días lista."
