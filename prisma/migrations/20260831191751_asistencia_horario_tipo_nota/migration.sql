-- AlterTable
ALTER TABLE "Asistencia" ADD COLUMN     "horaEntrada" TEXT,
ADD COLUMN     "horaSalida" TEXT,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'trabajo';
