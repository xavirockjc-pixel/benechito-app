-- Enlace a cliente negocio y a la venta creada al entregar.
ALTER TABLE "PedidoReparto" ADD COLUMN IF NOT EXISTS "negocioId" TEXT;
ALTER TABLE "PedidoReparto" ADD COLUMN IF NOT EXISTS "ventaId" TEXT;
