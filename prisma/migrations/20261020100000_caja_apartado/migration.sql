-- Dinero "apartado" al cerrar la caja: efectivo que se guarda APARTE de la caja
-- (no es parte de lo que debe quedar en el cajón). Se cuenta junto al contado
-- para cuadrar contra lo esperado. Idempotente.
ALTER TABLE "SesionCaja" ADD COLUMN IF NOT EXISTS "efectivoApartado" DECIMAL(12,2);
