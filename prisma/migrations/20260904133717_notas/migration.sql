-- CreateTable
CREATE TABLE "Nota" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'observacion',
    "area" TEXT NOT NULL DEFAULT 'general',
    "autor" TEXT,
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hechaEn" TIMESTAMP(3),

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Nota_estado_idx" ON "Nota"("estado");

-- CreateIndex
CREATE INDEX "Nota_area_idx" ON "Nota"("area");

