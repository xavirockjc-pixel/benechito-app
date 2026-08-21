-- CreateTable
CREATE TABLE "Preventa" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "mensaje" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'enviada',
    "canal" TEXT NOT NULL DEFAULT 'whatsapp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Preventa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Preventa_negocioId_idx" ON "Preventa"("negocioId");

-- CreateIndex
CREATE INDEX "Preventa_estado_idx" ON "Preventa"("estado");

-- AddForeignKey
ALTER TABLE "Preventa" ADD CONSTRAINT "Preventa_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
