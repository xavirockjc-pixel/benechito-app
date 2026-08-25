-- AlterTable
ALTER TABLE "Negocio" ADD COLUMN     "razonSocial" TEXT,
ADD COLUMN     "rut" TEXT;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "facturada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "folioFactura" TEXT;
