-- Reinicio de stock pedido por Xavier (2026-10-31): el LOCAL (Sala de Ventas) aún no
-- se ha trabajado y se sacaron productos sin cargarlos, por eso salían negativos.
-- Se deja el stock de productos del local en 0 (lo actualizará después) y se corrigen
-- TODOS los "números en menos" (no puede existir stock físico negativo).

-- 1) Stock de PRODUCTOS del LOCAL (ubicaciones tipo 'sala') → 0.
UPDATE "Stock" SET "cantidad" = 0
WHERE "ubicacionId" IN (SELECT "id" FROM "Ubicacion" WHERE "tipo" = 'sala')
  AND "cantidad" <> 0;

-- 2) Corrige negativos de productos en cualquier ubicación (fábrica, bodega, camiones).
UPDATE "Stock" SET "cantidad" = 0 WHERE "cantidad" < 0;

-- 3) Corrige negativos de helados por sabor (cámara / fabricación) en cualquier lado.
UPDATE "StockSabor" SET "cantidad" = 0 WHERE "cantidad" < 0;
