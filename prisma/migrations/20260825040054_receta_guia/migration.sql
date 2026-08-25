-- CreateTable
CREATE TABLE "RecetaGuia" (
    "id" TEXT NOT NULL,
    "linea" TEXT,
    "productoId" TEXT,
    "saborId" TEXT,
    "videoUrl" TEXT,
    "pasos" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecetaGuia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecetaGuia_linea_idx" ON "RecetaGuia"("linea");

-- CreateIndex
CREATE INDEX "RecetaGuia_productoId_idx" ON "RecetaGuia"("productoId");

-- CreateIndex
CREATE INDEX "RecetaGuia_saborId_idx" ON "RecetaGuia"("saborId");
