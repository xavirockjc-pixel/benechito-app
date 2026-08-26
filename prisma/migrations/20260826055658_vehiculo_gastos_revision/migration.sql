/*
  Warnings:

  - You are about to drop the `CostoReparto` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "CostoReparto";

-- CreateTable
CREATE TABLE "GastoVehiculo" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehiculoId" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'combustible',
    "monto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "litros" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "canal" TEXT,
    "notas" TEXT,
    "usuarioId" TEXT,
    "nombreUsuario" TEXT,

    CONSTRAINT "GastoVehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionVehiculo" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehiculoId" TEXT,
    "kmSalida" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kmEntrada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "agua" TEXT NOT NULL DEFAULT 'ok',
    "aceite" TEXT NOT NULL DEFAULT 'ok',
    "neumaticos" TEXT NOT NULL DEFAULT 'ok',
    "luces" TEXT NOT NULL DEFAULT 'ok',
    "frenos" TEXT NOT NULL DEFAULT 'ok',
    "limpieza" TEXT NOT NULL DEFAULT 'ok',
    "documentos" TEXT NOT NULL DEFAULT 'ok',
    "observaciones" TEXT,
    "usuarioId" TEXT,
    "nombreUsuario" TEXT,

    CONSTRAINT "RevisionVehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GastoVehiculo_fecha_idx" ON "GastoVehiculo"("fecha");

-- CreateIndex
CREATE INDEX "GastoVehiculo_tipo_idx" ON "GastoVehiculo"("tipo");

-- CreateIndex
CREATE INDEX "RevisionVehiculo_fecha_idx" ON "RevisionVehiculo"("fecha");
