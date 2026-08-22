-- AlterTable
ALTER TABLE "MovimientoBodega" ADD COLUMN     "detalle" TEXT,
ADD COLUMN     "ubicacionId" TEXT,
ADD COLUMN     "zona" TEXT NOT NULL DEFAULT 'bodega';

-- CreateIndex
CREATE INDEX "MovimientoBodega_zona_idx" ON "MovimientoBodega"("zona");
