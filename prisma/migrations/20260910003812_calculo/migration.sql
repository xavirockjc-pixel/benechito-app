-- CreateTable
CREATE TABLE "Calculo" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'producto',
    "nombre" TEXT NOT NULL,
    "productoId" TEXT,
    "precioVenta" DECIMAL(12,2),
    "rendimiento" INTEGER,
    "costoExtra" DECIMAL(12,2),
    "items" TEXT,
    "inversion" DECIMAL(12,2),
    "retornoMensual" DECIMAL(12,2),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Calculo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Calculo_tipo_idx" ON "Calculo"("tipo");

