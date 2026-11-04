-- Respuesta del cliente a la preventa (qué pide / cuándo vuelve) + control de atención.
ALTER TABLE "Preventa" ADD COLUMN IF NOT EXISTS "detalle" TEXT;
ALTER TABLE "Preventa" ADD COLUMN IF NOT EXISTS "atendida" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Preventa" ADD COLUMN IF NOT EXISTS "respondidoEn" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Preventa_atendida_idx" ON "Preventa"("atendida");
