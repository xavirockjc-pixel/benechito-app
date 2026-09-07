-- CreateTable
CREATE TABLE "MovimientoCajaVecina" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "detalle" TEXT,
    "foto" TEXT,
    "usuarioId" TEXT,
    "nombreUsuario" TEXT,

    CONSTRAINT "MovimientoCajaVecina_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimientoCajaVecina_fecha_idx" ON "MovimientoCajaVecina"("fecha");

