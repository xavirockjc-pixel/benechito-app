-- Clientes particulares por sector (para avisar cuando pasa la ruta).
CREATE TABLE IF NOT EXISTS "ClienteParticular" (
  "id"        TEXT PRIMARY KEY,
  "nombre"    TEXT NOT NULL,
  "telefono"  TEXT,
  "sector"    TEXT,
  "notas"     TEXT,
  "activo"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ClienteParticular_sector_idx" ON "ClienteParticular"("sector");
