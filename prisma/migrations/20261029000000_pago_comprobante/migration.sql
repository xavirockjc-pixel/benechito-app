-- Comprobante de transferencia (imagen/archivo como data URL) en el pago.
ALTER TABLE "Pago" ADD COLUMN "comprobante" TEXT;
