-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "canal" TEXT NOT NULL DEFAULT 'directa';

-- Backfill: deduce el canal de las ventas existentes.
UPDATE "Venta" SET "canal" = 'local' WHERE "sesionCajaId" IS NOT NULL;
UPDATE "Venta" SET "canal" = 'terreno' WHERE "sesionCajaId" IS NULL AND "ubicacionId" IN (SELECT "id" FROM "Ubicacion" WHERE "tipo" = 'vehiculo');
