-- AlterTable
ALTER TABLE "Negocio" ADD COLUMN     "portalToken" TEXT;

-- CreateTable
CREATE TABLE "Novedad" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'promo',
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fotoUrl" TEXT,
    "cta" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Novedad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Novedad_activo_idx" ON "Novedad"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Negocio_portalToken_key" ON "Negocio"("portalToken");

