-- Reparto externo (moto Uber Direct / PedidosYa que viene a buscar el pedido al
-- local): cómo se entrega cada delivery y cuánto cobra el servicio. Idempotente.
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "repartoPor" TEXT;
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "courier" TEXT;
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "costoReparto" DECIMAL(12,2);
ALTER TABLE "PedidoReparto" ADD COLUMN IF NOT EXISTS "repartoPor" TEXT;
ALTER TABLE "PedidoReparto" ADD COLUMN IF NOT EXISTS "courier" TEXT;
ALTER TABLE "PedidoReparto" ADD COLUMN IF NOT EXISTS "costoReparto" DECIMAL(12,2);
