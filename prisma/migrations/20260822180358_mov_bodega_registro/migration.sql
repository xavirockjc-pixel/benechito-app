-- CreateTable
CREATE TABLE "MovimientoBodega" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "clase" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "usuarioId" TEXT,
    "nombreUsuario" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoBodega_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimientoBodega_fecha_idx" ON "MovimientoBodega"("fecha");
