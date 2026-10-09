-- Costeo por línea de producto (pago estimado, precio de venta, costo real).
CREATE TABLE IF NOT EXISTS "CostoLinea" (
  "id"          TEXT PRIMARY KEY,
  "linea"       TEXT NOT NULL,
  "pagoUnit"    DECIMAL(12,2),
  "precioVenta" DECIMAL(12,2),
  "costoReal"   DECIMAL(12,2),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "CostoLinea_linea_key" ON "CostoLinea"("linea");
