-- AlterTable
ALTER TABLE "Nota" ADD COLUMN     "accion" TEXT NOT NULL DEFAULT 'ninguna',
ADD COLUMN     "accionEstado" TEXT NOT NULL DEFAULT 'na',
ADD COLUMN     "cantidad" INTEGER,
ADD COLUMN     "fechaObjetivo" TIMESTAMP(3),
ADD COLUMN     "itemNombre" TEXT,
ADD COLUMN     "productoId" TEXT,
ADD COLUMN     "refMovimientoId" TEXT;

-- CreateIndex
CREATE INDEX "Nota_accionEstado_idx" ON "Nota"("accionEstado");

