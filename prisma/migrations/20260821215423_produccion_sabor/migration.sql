-- DropForeignKey
ALTER TABLE "OrdenProduccion" DROP CONSTRAINT "OrdenProduccion_productoId_fkey";

-- AlterTable
ALTER TABLE "OrdenProduccion" ADD COLUMN     "saborId" TEXT,
ALTER COLUMN "productoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "OrdenProduccion" ADD CONSTRAINT "OrdenProduccion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenProduccion" ADD CONSTRAINT "OrdenProduccion_saborId_fkey" FOREIGN KEY ("saborId") REFERENCES "Sabor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
