-- Motivo de cada movimiento de bodega (salida: camion/local/distribuidor/venta/otro;
-- entrada: produccion/manual). Ordena el registro por sección.
ALTER TABLE "MovimientoBodega" ADD COLUMN IF NOT EXISTS "motivo" TEXT;
