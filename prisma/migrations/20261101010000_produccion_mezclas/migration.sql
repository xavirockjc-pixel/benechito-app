-- Registro de mezclas hechas en producción (para control de consumo y pronóstico).
CREATE TABLE IF NOT EXISTS "ProduccionMezcla" (
  "id"            TEXT NOT NULL,
  "tipo"          TEXT NOT NULL DEFAULT 'mezcla',
  "mezclas"       INTEGER NOT NULL DEFAULT 1,
  "nota"          TEXT,
  "usuarioId"     TEXT,
  "nombreUsuario" TEXT,
  "fecha"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProduccionMezcla_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProduccionMezcla_fecha_idx" ON "ProduccionMezcla"("fecha");
CREATE INDEX IF NOT EXISTS "ProduccionMezcla_tipo_idx" ON "ProduccionMezcla"("tipo");
