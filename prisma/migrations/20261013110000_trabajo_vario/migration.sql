-- Trabajos varios del vendedor (fletes, arreglos, compras, mantención…).
CREATE TABLE IF NOT EXISTS "TrabajoVario" (
  "id"            TEXT PRIMARY KEY,
  "tipo"          TEXT NOT NULL,
  "descripcion"   TEXT NOT NULL,
  "monto"         DECIMAL(12,2),
  "usuarioId"     TEXT,
  "nombreUsuario" TEXT,
  "fecha"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "TrabajoVario_fecha_idx" ON "TrabajoVario"("fecha");
