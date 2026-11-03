-- Enlace propio de cada factura (para que el mensaje al cliente lleve el documento).
ALTER TABLE "DocumentoVenta" ADD COLUMN IF NOT EXISTS "enlaceToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentoVenta_enlaceToken_key" ON "DocumentoVenta"("enlaceToken");
