-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "seccion" TEXT NOT NULL DEFAULT 'propio';

-- Backfill: clasifica los productos existentes por sección.
UPDATE "Producto" SET "seccion" = 'distribucion' WHERE "soloLocal" = true;
UPDATE "Producto" SET "seccion" = 'ruta' WHERE "tipo" = 'reventa' AND "soloLocal" = false;
