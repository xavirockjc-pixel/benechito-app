-- CreateTable
CREATE TABLE "Flete" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DECIMAL(12,2) NOT NULL,
    "destino" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Flete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Flete_fecha_idx" ON "Flete"("fecha");

