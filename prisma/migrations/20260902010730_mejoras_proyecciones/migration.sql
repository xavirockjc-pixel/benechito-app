-- CreateTable
CREATE TABLE "Mejora" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalle" TEXT,
    "area" TEXT NOT NULL DEFAULT 'general',
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "fechaObjetivo" TIMESTAMP(3),
    "recordar" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completadaEn" TIMESTAMP(3),

    CONSTRAINT "Mejora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mejora_estado_idx" ON "Mejora"("estado");

-- CreateIndex
CREATE INDEX "Mejora_fechaObjetivo_idx" ON "Mejora"("fechaObjetivo");
