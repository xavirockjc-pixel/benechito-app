-- Más datos del cliente particular: ubicación, dirección, fecha de entrega.
ALTER TABLE "ClienteParticular" ADD COLUMN IF NOT EXISTS "direccion" TEXT;
ALTER TABLE "ClienteParticular" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "ClienteParticular" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
ALTER TABLE "ClienteParticular" ADD COLUMN IF NOT EXISTS "mapsUrl" TEXT;
ALTER TABLE "ClienteParticular" ADD COLUMN IF NOT EXISTS "fechaEntrega" TIMESTAMP(3);
