-- Clave del dueño para autorizar correcciones de ventas (anular / cambiar medio).
ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "cajaPin" TEXT;
