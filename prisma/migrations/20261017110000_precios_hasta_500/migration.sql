-- Deja el precio por mayor del listado hasta 500 unidades: quita el tramo de 1.000.
-- Solo afecta a los 4 helados del listado en las listas que ve el cliente
-- (detalle "sala" y online "web"); no toca tramos de otras listas/canales.
-- Idempotente: si ya no existe el tramo 1000, no hace nada.

DELETE FROM "PrecioProducto" pp
USING "Producto" p, "ListaPrecio" l
WHERE pp."productoId" = p."id"
  AND pp."listaId" = l."id"
  AND p."sku" IN ('HEL-tu-y-yo', 'HEL-paleta-de-leche', 'HEL-paleta-de-agua', 'HEL-postre-500-ml')
  AND l."canal" IN ('sala', 'web')
  AND pp."cantidadMinima" = 1000;
