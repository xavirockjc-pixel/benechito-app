-- Atribución de producción por TRABAJADOR (tablet compartido): CSV de trabajadorId.
ALTER TABLE "MovimientoBodega" ADD COLUMN IF NOT EXISTS "participantesTrab" TEXT;
