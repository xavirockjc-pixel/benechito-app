-- AlterTable
ALTER TABLE "RecetaItem" ADD COLUMN     "linea" TEXT;

-- CreateTable
CREATE TABLE "AgregadoUso" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "controlId" TEXT,
    "materiaPrimaId" TEXT NOT NULL,
    "nombreInsumo" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "linea" TEXT,
    "sabor" TEXT,
    "formato" TEXT,
    "unidadesProducidas" INTEGER NOT NULL DEFAULT 0,
    "usuarioId" TEXT,
    "nombreUsuario" TEXT,

    CONSTRAINT "AgregadoUso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgregadoUso_fecha_idx" ON "AgregadoUso"("fecha");

-- CreateIndex
CREATE INDEX "AgregadoUso_materiaPrimaId_idx" ON "AgregadoUso"("materiaPrimaId");

-- CreateIndex
CREATE INDEX "RecetaItem_linea_idx" ON "RecetaItem"("linea");
