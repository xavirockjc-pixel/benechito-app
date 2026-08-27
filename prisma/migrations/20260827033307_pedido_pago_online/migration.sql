-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "pagado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pagoRef" TEXT;
