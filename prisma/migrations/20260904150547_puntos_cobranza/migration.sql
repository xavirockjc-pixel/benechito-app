-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "puntosActivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "puntosPorMonto" INTEGER NOT NULL DEFAULT 1000;

-- AlterTable
ALTER TABLE "Negocio" ADD COLUMN     "motivoNoCobrar" TEXT,
ADD COLUMN     "noCobrar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "puntos" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MovimientoPuntos" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "puntos" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'gana',
    "motivo" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoPuntos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimientoPuntos_negocioId_idx" ON "MovimientoPuntos"("negocioId");

-- AddForeignKey
ALTER TABLE "MovimientoPuntos" ADD CONSTRAINT "MovimientoPuntos_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

