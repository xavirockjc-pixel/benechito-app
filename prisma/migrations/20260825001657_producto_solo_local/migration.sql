-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "soloLocal" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: los productos de reventa/distribucion nacen como "solo local".
UPDATE "Producto" SET "soloLocal" = true WHERE "tipo" = 'reventa' OR "categoria" = 'Distribución';
