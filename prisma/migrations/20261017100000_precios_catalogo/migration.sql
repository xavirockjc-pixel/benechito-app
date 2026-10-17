-- Carga los precios oficiales del listado Benechito (helados artesanales) al catálogo.
-- Productos: Tú y Yo (125 ml), Paleta de Leche (80 ml), Paleta de Agua (80 ml) y Postre 500 ml.
-- Se cargan el precio base (1 unidad) y los TRAMOS por cantidad (10, 25, 50, 100, 200, 300,
-- 500, 1.000 …) en las listas que ve el cliente en la tienda: detalle (canal "sala") y online
-- (canal "web"). Así el carrito aplica solo el precio por bolsa según cuánto lleva.
--
-- Idempotente: se puede volver a correr sin duplicar (ON CONFLICT por el único
-- productoId+listaId+cantidadMinima). La central puede ajustar cualquier precio
-- después desde el panel (Catálogo → Precios) sin que esto lo reescriba.

-- 1) Publicar en la tienda los 4 helados del listado (no pisa descripciones existentes).
UPDATE "Producto"
SET "publicarTienda" = true,
    "activo" = true,
    "descripcion" = COALESCE(NULLIF("descripcion", ''), CASE "sku"
      WHEN 'HEL-tu-y-yo'          THEN 'Helado para compartir · 125 ml'
      WHEN 'HEL-paleta-de-leche'  THEN 'Paleta cremosa de leche · 80 ml'
      WHEN 'HEL-paleta-de-agua'   THEN 'Paleta refrescante y frutal · 80 ml'
      WHEN 'HEL-postre-500-ml'    THEN 'Postre helado cremoso · 500 ml'
    END)
WHERE "sku" IN ('HEL-tu-y-yo', 'HEL-paleta-de-leche', 'HEL-paleta-de-agua', 'HEL-postre-500-ml');

-- 2) Precios base + tramos por cantidad, en las listas "sala" (detalle) y "web" (online).
WITH precios(sku, cm, precio) AS (
  VALUES
    -- Tú y Yo (125 ml)
    ('HEL-tu-y-yo',         1,   350),
    ('HEL-tu-y-yo',         10,  330),
    ('HEL-tu-y-yo',         25,  300),
    ('HEL-tu-y-yo',         50,  280),
    ('HEL-tu-y-yo',         100, 270),
    ('HEL-tu-y-yo',         200, 260),
    ('HEL-tu-y-yo',         300, 250),
    ('HEL-tu-y-yo',         500, 240),
    ('HEL-tu-y-yo',         1000, 220),
    -- Paleta de Leche (80 ml)
    ('HEL-paleta-de-leche', 1,   250),
    ('HEL-paleta-de-leche', 10,  220),
    ('HEL-paleta-de-leche', 25,  200),
    ('HEL-paleta-de-leche', 50,  200),
    ('HEL-paleta-de-leche', 100, 190),
    ('HEL-paleta-de-leche', 200, 180),
    ('HEL-paleta-de-leche', 300, 170),
    ('HEL-paleta-de-leche', 500, 160),
    ('HEL-paleta-de-leche', 1000, 150),
    -- Paleta de Agua (80 ml)
    ('HEL-paleta-de-agua',  1,   200),
    ('HEL-paleta-de-agua',  10,  170),
    ('HEL-paleta-de-agua',  25,  160),
    ('HEL-paleta-de-agua',  50,  150),
    ('HEL-paleta-de-agua',  100, 140),
    ('HEL-paleta-de-agua',  300, 130),
    ('HEL-paleta-de-agua',  1000, 120),
    -- Postre 500 ml
    ('HEL-postre-500-ml',   1,    1600),
    ('HEL-postre-500-ml',   10,   1400),
    ('HEL-postre-500-ml',   16,   1300),
    ('HEL-postre-500-ml',   100,  1100),
    ('HEL-postre-500-ml',   128,  1100),
    ('HEL-postre-500-ml',   200,  1050),
    ('HEL-postre-500-ml',   500,  1000),
    ('HEL-postre-500-ml',   1000, 950)
),
listas AS (
  -- Una lista activa por canal (la más antigua, por si hubiera duplicadas).
  SELECT DISTINCT ON (canal) id, canal
  FROM "ListaPrecio"
  WHERE "activo" = true AND canal IN ('sala', 'web')
  ORDER BY canal, "createdAt" ASC
)
INSERT INTO "PrecioProducto" ("id", "productoId", "listaId", "precio", "cantidadMinima")
SELECT
  'px_' || p."id" || '_' || l."id" || '_' || pr.cm::text,
  p."id",
  l."id",
  pr.precio,
  pr.cm
FROM precios pr
JOIN "Producto" p ON p."sku" = pr.sku
CROSS JOIN listas l
ON CONFLICT ("productoId", "listaId", "cantidadMinima")
DO UPDATE SET "precio" = EXCLUDED."precio";
