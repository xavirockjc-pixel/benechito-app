-- Motivo libre para salidas/ventas de stock (ej: "Sra Checa", "al local", "Don Alex").
ALTER TABLE "MovimientoStock" ADD COLUMN IF NOT EXISTS "motivo" TEXT;
