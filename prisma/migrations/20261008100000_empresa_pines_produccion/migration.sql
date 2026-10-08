-- PIN/código por producto en Producción (JSON {linea: pin}).
ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "pinesProduccion" TEXT;
