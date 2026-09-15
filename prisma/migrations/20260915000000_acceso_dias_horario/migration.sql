-- Días de acceso (lunes a sábado) + apertura 08:00 sin cierre nocturno molesto.
ALTER TABLE "Empresa" ADD COLUMN "accesoDias" TEXT DEFAULT '1,2,3,4,5,6';
UPDATE "Empresa" SET "accesoDias" = '1,2,3,4,5,6' WHERE "accesoDias" IS NULL;

-- Sincroniza los defaults del esquema.
ALTER TABLE "Empresa" ALTER COLUMN "accesoDesde" SET DEFAULT '08:00';
ALTER TABLE "Empresa" ALTER COLUMN "accesoHasta" SET DEFAULT '23:59';

-- Aplica el horario pedido a la empresa existente: abre 08:00, disponible hasta la noche.
UPDATE "Empresa" SET "accesoDesde" = '08:00', "accesoHasta" = '23:59';
