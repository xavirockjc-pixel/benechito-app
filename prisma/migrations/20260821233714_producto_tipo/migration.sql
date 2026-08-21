-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "costo" DECIMAL(12,2),
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'propio';
