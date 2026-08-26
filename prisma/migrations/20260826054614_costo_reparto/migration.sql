-- CreateTable
CREATE TABLE "CostoReparto" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canal" TEXT,
    "combustible" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "horas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "km" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notas" TEXT,
    "usuarioId" TEXT,
    "nombreUsuario" TEXT,

    CONSTRAINT "CostoReparto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostoReparto_fecha_idx" ON "CostoReparto"("fecha");
