-- Packs/bolsas por producto para el stock del vendedor: postres 16, paletas y
-- tú y yo 50. Además separa "Tú y Yo" en Tradicional y Surtido. Idempotente.

ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "unidadesPack" INTEGER;

-- Tamaño de pack por línea.
UPDATE "Producto" SET "unidadesPack" = 16 WHERE "sku" = 'HEL-postre-500-ml';
UPDATE "Producto" SET "unidadesPack" = 50 WHERE "sku" IN ('HEL-paleta-de-leche', 'HEL-paleta-de-agua');

-- Tú y Yo: el existente pasa a ser "Tradicional" (conserva sku, precios y tienda).
UPDATE "Producto" SET "nombre" = 'Tú y Yo Tradicional', "unidadesPack" = 50 WHERE "sku" = 'HEL-tu-y-yo';

-- Tú y Yo Surtido: producto nuevo, copiado del tradicional.
INSERT INTO "Producto" ("id", "linea", "nombre", "formato", "sku", "categoria", "tipo", "seccion", "activo", "soloLocal", "publicarTienda", "unidadesPack", "descripcion", "createdAt")
SELECT 'prod_tuyyo_surtido', "linea", 'Tú y Yo Surtido', "formato", 'HEL-tu-y-yo-surtido', "categoria", "tipo", "seccion", true, "soloLocal", "publicarTienda", 50, "descripcion", now()
FROM "Producto" WHERE "sku" = 'HEL-tu-y-yo'
ON CONFLICT ("sku") DO NOTHING;

-- Copia los precios del tradicional al surtido (mismas listas y tramos).
INSERT INTO "PrecioProducto" ("id", "productoId", "listaId", "precio", "cantidadMinima", "descuento")
SELECT 'pxs_' || pp."listaId" || '_' || pp."cantidadMinima"::text, 'prod_tuyyo_surtido', pp."listaId", pp."precio", pp."cantidadMinima", pp."descuento"
FROM "PrecioProducto" pp
JOIN "Producto" p ON p."id" = pp."productoId"
WHERE p."sku" = 'HEL-tu-y-yo'
ON CONFLICT ("productoId", "listaId", "cantidadMinima") DO NOTHING;
