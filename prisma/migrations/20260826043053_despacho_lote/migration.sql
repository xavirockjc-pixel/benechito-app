-- CreateTable
CREATE TABLE "DespachoLote" (
    "id" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "negocioId" TEXT,
    "clienteTexto" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notas" TEXT,
    "usuarioId" TEXT,
    "nombreUsuario" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DespachoLote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DespachoLote_controlId_idx" ON "DespachoLote"("controlId");

-- CreateIndex
CREATE INDEX "DespachoLote_negocioId_idx" ON "DespachoLote"("negocioId");

-- AddForeignKey
ALTER TABLE "DespachoLote" ADD CONSTRAINT "DespachoLote_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "ControlCalidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DespachoLote" ADD CONSTRAINT "DespachoLote_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
