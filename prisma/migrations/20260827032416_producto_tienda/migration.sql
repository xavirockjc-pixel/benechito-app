-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "publicarTienda" BOOLEAN NOT NULL DEFAULT false;
