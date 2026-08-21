-- DropForeignKey
ALTER TABLE "ReposicionItem" DROP CONSTRAINT "ReposicionItem_productoId_fkey";

-- AlterTable
ALTER TABLE "ReposicionItem" ADD COLUMN     "saborId" TEXT,
ALTER COLUMN "productoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ReposicionItem" ADD CONSTRAINT "ReposicionItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReposicionItem" ADD CONSTRAINT "ReposicionItem_saborId_fkey" FOREIGN KEY ("saborId") REFERENCES "Sabor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
