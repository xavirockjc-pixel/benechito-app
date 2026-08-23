-- CreateTable
CREATE TABLE "Agenda" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'otro',
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "negocioId" TEXT,
    "productoId" TEXT,
    "saborId" TEXT,
    "cantidad" INTEGER,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agenda_fecha_idx" ON "Agenda"("fecha");

-- CreateIndex
CREATE INDEX "Agenda_estado_idx" ON "Agenda"("estado");
