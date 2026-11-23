-- Pago por producción (trato): $ por unidad producida de cada helado. Editable.
ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "precioTrato" DECIMAL(12,2);
