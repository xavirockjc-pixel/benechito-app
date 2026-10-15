-- Pedido de reparto por WhatsApp (con ubicación extraída y orden de ruta).
CREATE TABLE IF NOT EXISTS "PedidoReparto" (
  "id"            TEXT PRIMARY KEY,
  "cliente"       TEXT,
  "telefono"      TEXT,
  "pedido"        TEXT NOT NULL,
  "monto"         DECIMAL(12,2),
  "estadoPago"    TEXT NOT NULL DEFAULT 'por_cobrar',
  "lat"           DOUBLE PRECISION,
  "lng"           DOUBLE PRECISION,
  "mapsUrl"       TEXT,
  "direccion"     TEXT,
  "estado"        TEXT NOT NULL DEFAULT 'pendiente',
  "orden"         INTEGER NOT NULL DEFAULT 0,
  "fecha"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "entregadoEn"   TIMESTAMP(3),
  "usuarioId"     TEXT,
  "nombreUsuario" TEXT
);
CREATE INDEX IF NOT EXISTS "PedidoReparto_fecha_idx" ON "PedidoReparto"("fecha");
CREATE INDEX IF NOT EXISTS "PedidoReparto_estado_idx" ON "PedidoReparto"("estado");
