-- AlterTable
ALTER TABLE "MovimientoMateria" ADD COLUMN     "lote" TEXT,
ADD COLUMN     "vence" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "MovimientoMateria_referencia_idx" ON "MovimientoMateria"("referencia");
