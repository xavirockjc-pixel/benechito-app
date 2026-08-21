-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "vehiculoId" TEXT;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Ubicacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
