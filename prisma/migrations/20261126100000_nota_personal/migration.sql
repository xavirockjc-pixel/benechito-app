-- Notas/recordatorios privados de un trabajador (bodeguero): calendario + buscador.
CREATE TABLE IF NOT EXISTS "NotaPersonal" (
  "id" TEXT PRIMARY KEY,
  "usuarioId" TEXT NOT NULL,
  "area" TEXT NOT NULL DEFAULT 'bodega',
  "asunto" TEXT,
  "texto" TEXT NOT NULL,
  "color" TEXT,
  "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "NotaPersonal_usuarioId_idx" ON "NotaPersonal"("usuarioId");
CREATE INDEX IF NOT EXISTS "NotaPersonal_fecha_idx" ON "NotaPersonal"("fecha");
