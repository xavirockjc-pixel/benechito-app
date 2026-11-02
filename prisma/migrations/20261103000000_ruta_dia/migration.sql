-- Día de la semana por ruta del vendedor (para la preventa el día anterior).
CREATE TABLE IF NOT EXISTS "RutaDia" (
  "ruta"      TEXT NOT NULL,
  "dia"       INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RutaDia_pkey" PRIMARY KEY ("ruta")
);
