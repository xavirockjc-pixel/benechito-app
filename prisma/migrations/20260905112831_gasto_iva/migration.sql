-- AlterTable
ALTER TABLE "Gasto" ADD COLUMN     "conFactura" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "iva" DECIMAL(12,2),
ADD COLUMN     "proveedor" TEXT;

