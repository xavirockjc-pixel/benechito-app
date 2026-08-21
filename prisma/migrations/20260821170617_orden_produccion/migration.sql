-- CreateTable
CREATE TABLE "OrdenProduccion" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidadPlan" INTEGER NOT NULL,
    "cantidadReal" INTEGER,
    "merma" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'planificada',
    "lote" TEXT,
    "responsable" TEXT,
    "notas" TEXT,
    "ubicacionDestinoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaTermino" TIMESTAMP(3),

    CONSTRAINT "OrdenProduccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrdenProduccion_estado_idx" ON "OrdenProduccion"("estado");

-- AddForeignKey
ALTER TABLE "OrdenProduccion" ADD CONSTRAINT "OrdenProduccion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenProduccion" ADD CONSTRAINT "OrdenProduccion_ubicacionDestinoId_fkey" FOREIGN KEY ("ubicacionDestinoId") REFERENCES "Ubicacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
