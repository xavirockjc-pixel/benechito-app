-- AlterTable
ALTER TABLE "Agenda" ADD COLUMN     "canal" TEXT,
ADD COLUMN     "contacto" TEXT,
ADD COLUMN     "destino" TEXT;

-- CreateIndex
CREATE INDEX "Agenda_destino_idx" ON "Agenda"("destino");
