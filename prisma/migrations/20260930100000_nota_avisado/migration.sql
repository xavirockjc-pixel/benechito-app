-- Alarma enviada de una nota (recordatorio): evita reenviar el mismo aviso.
ALTER TABLE "Nota" ADD COLUMN IF NOT EXISTS "avisadoEn" TIMESTAMP(3);
