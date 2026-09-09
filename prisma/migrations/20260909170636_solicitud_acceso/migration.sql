-- CreateTable
CREATE TABLE "SolicitudAcceso" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rol" TEXT NOT NULL,
    "usuarioId" TEXT,
    "nombreUsuario" TEXT,
    "motivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolicitudAcceso_estado_idx" ON "SolicitudAcceso"("estado");

