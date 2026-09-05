-- AlterTable
ALTER TABLE "Trabajador" ADD COLUMN     "modalidadPago" TEXT NOT NULL DEFAULT 'mensual',
ADD COLUMN     "tarifa" DECIMAL(12,2);

