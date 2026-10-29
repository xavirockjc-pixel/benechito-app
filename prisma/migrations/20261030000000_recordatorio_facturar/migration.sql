-- Recordatorio de facturación por cliente (se marca al visitar y se borra al facturar).
ALTER TABLE "Negocio" ADD COLUMN IF NOT EXISTS "facturarPendiente" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Negocio" ADD COLUMN IF NOT EXISTS "facturarNota" TEXT;
