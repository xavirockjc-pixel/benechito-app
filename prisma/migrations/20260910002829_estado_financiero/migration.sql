-- AlterTable
ALTER TABLE "Gasto" ADD COLUMN     "personal" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Deuda" (
    "id" TEXT NOT NULL,
    "acreedor" TEXT NOT NULL,
    "motivo" TEXT,
    "monto" DECIMAL(12,2) NOT NULL,
    "pagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "personal" BOOLEAN NOT NULL DEFAULT false,
    "categoria" TEXT,
    "fechaVence" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deuda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deuda_estado_idx" ON "Deuda"("estado");

