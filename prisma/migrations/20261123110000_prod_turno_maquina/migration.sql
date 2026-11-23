-- Producción: turno y máquina en cada movimiento (para dividir turnos y el pago por producción).
ALTER TABLE "MovimientoBodega" ADD COLUMN IF NOT EXISTS "turno" TEXT;
ALTER TABLE "MovimientoBodega" ADD COLUMN IF NOT EXISTS "maquina" TEXT;
