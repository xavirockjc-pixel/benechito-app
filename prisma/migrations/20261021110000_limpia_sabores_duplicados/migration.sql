-- Limpia los "sabores" que en realidad duplican PRODUCTOS (ej: "paletas de leche"
-- 2750, "tú y yo" 1700, "tú y yo surtido" 2800). Esos no son sabores reales y
-- ensucian el stock. Se borran junto con su stock por sabor. No toca sabores
-- reales de trufas/cuchuflís (Frutilla, Pistacho, Tradicional de trufa, etc.).
-- Idempotente.

-- Desenlaza referencias sin cascada para poder borrar el sabor.
UPDATE "ReposicionItem" SET "saborId" = NULL
WHERE "saborId" IN (SELECT "id" FROM "Sabor"
  WHERE "nombre" ILIKE '%paleta%' OR "nombre" ILIKE '%y yo%' OR "nombre" ILIKE '%tuyo%' OR "nombre" ILIKE '%postre%');

UPDATE "OrdenProduccion" SET "saborId" = NULL
WHERE "saborId" IN (SELECT "id" FROM "Sabor"
  WHERE "nombre" ILIKE '%paleta%' OR "nombre" ILIKE '%y yo%' OR "nombre" ILIKE '%tuyo%' OR "nombre" ILIKE '%postre%');

-- Borra los sabores duplicados (StockSabor y RecetaItem caen en cascada).
DELETE FROM "Sabor"
WHERE "nombre" ILIKE '%paleta%' OR "nombre" ILIKE '%y yo%' OR "nombre" ILIKE '%tuyo%' OR "nombre" ILIKE '%postre%';
