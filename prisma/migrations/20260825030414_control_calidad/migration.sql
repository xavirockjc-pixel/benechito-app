-- CreateTable
CREATE TABLE "ControlCalidad" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "turno" TEXT,
    "operarios" TEXT,
    "clase" TEXT,
    "refId" TEXT,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "itemsMarcados" INTEGER NOT NULL DEFAULT 0,
    "itemsTotal" INTEGER NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "usuarioId" TEXT,
    "nombreUsuario" TEXT,

    CONSTRAINT "ControlCalidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ControlCalidad_fecha_idx" ON "ControlCalidad"("fecha");
