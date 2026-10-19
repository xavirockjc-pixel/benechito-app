-- Agrega "sector" a los pedidos de reparto, para anotar y agrupar los pedidos
-- por zona (Lota, Coronel…) y no saltarse ninguno. Idempotente.
ALTER TABLE "PedidoReparto" ADD COLUMN IF NOT EXISTS "sector" TEXT;
