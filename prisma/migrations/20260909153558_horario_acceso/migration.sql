-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "accesoDesde" TEXT DEFAULT '11:00',
ADD COLUMN     "accesoHasta" TEXT DEFAULT '19:35',
ADD COLUMN     "accesoRoles" TEXT DEFAULT 'caja';

