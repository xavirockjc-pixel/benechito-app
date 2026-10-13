-- Salida de bodega con destino (pendiente de confirmar como venta).
CREATE TABLE IF NOT EXISTS "SalidaBodega" (
  "id"            TEXT PRIMARY KEY,
  "clase"         TEXT NOT NULL,
  "refId"         TEXT NOT NULL,
  "nombre"        TEXT NOT NULL,
  "cantidad"      INTEGER NOT NULL,
  "destinoTexto"  TEXT,
  "negocioId"     TEXT,
  "estado"        TEXT NOT NULL DEFAULT 'pendiente',
  "ventaId"       TEXT,
  "total"         DECIMAL(12,2),
  "usuarioId"     TEXT,
  "nombreUsuario" TEXT,
  "fecha"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resueltaEn"    TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "SalidaBodega_estado_idx" ON "SalidaBodega"("estado");
CREATE INDEX IF NOT EXISTS "SalidaBodega_fecha_idx" ON "SalidaBodega"("fecha");
