-- Copia los precios de los helados (los de la lista "sala") a las listas que usa
-- el vendedor en terreno: "reparto" y "negocio", para que estén disponibles al
-- vender. No pisa precios ya cargados a mano (ON CONFLICT DO NOTHING). Idempotente.

INSERT INTO "PrecioProducto" ("id", "productoId", "listaId", "precio", "cantidadMinima", "descuento")
SELECT 'pv_' || l."canal" || '_' || pp."productoId" || '_' || pp."cantidadMinima"::text,
       pp."productoId", l."id", pp."precio", pp."cantidadMinima", pp."descuento"
FROM "PrecioProducto" pp
JOIN "ListaPrecio" sala ON sala."id" = pp."listaId" AND sala."canal" = 'sala' AND sala."activo" = true
JOIN "Producto" p ON p."id" = pp."productoId"
JOIN (
  SELECT DISTINCT ON ("canal") "id", "canal" FROM "ListaPrecio"
  WHERE "activo" = true AND "canal" IN ('reparto', 'negocio')
  ORDER BY "canal", "createdAt" ASC
) l ON true
WHERE p."sku" IN ('HEL-tu-y-yo', 'HEL-tu-y-yo-surtido', 'HEL-paleta-de-leche', 'HEL-paleta-de-agua', 'HEL-postre-500-ml')
ON CONFLICT ("productoId", "listaId", "cantidadMinima") DO NOTHING;
