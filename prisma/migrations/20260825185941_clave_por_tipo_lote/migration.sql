-- AlterTable
ALTER TABLE "ControlCalidad" ADD COLUMN     "lote" TEXT;

-- CreateTable
CREATE TABLE "ClaveReceta" (
    "id" TEXT NOT NULL,
    "linea" TEXT NOT NULL,
    "clave" TEXT NOT NULL,

    CONSTRAINT "ClaveReceta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClaveReceta_linea_key" ON "ClaveReceta"("linea");
