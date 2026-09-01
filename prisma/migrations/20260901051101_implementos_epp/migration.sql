-- Extensión Implementos (EPP) y entregas. Migración aditiva.

CREATE TABLE "Implemento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Implemento_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Implemento_activo_idx" ON "Implemento"("activo");

CREATE TABLE "EntregaImplemento" (
    "id" TEXT NOT NULL,
    "implementoId" TEXT NOT NULL,
    "trabajador" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT,
    "notas" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EntregaImplemento_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EntregaImplemento_implementoId_idx" ON "EntregaImplemento"("implementoId");
CREATE INDEX "EntregaImplemento_fecha_idx" ON "EntregaImplemento"("fecha");

ALTER TABLE "EntregaImplemento" ADD CONSTRAINT "EntregaImplemento_implementoId_fkey" FOREIGN KEY ("implementoId") REFERENCES "Implemento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
