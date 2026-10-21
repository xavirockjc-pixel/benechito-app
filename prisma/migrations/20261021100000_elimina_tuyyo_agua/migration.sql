-- Elimina el producto fantasma "Tú y Yo de Agua" (ya no existe y confunde el
-- dictado de "Tú y Yo Surtido"). Coincide por nombre que contenga "yo" Y "agua"
-- (no toca "Paleta de Agua" ni "Tú y Yo Surtido/Tradicional"). Idempotente.

-- 1) Limpia su configuración (precios, stock, fotos, instalaciones, reposición).
DELETE FROM "PrecioProducto" WHERE "productoId" IN (SELECT "id" FROM "Producto" WHERE "nombre" ILIKE '%yo%' AND "nombre" ILIKE '%agua%');
DELETE FROM "Stock"          WHERE "productoId" IN (SELECT "id" FROM "Producto" WHERE "nombre" ILIKE '%yo%' AND "nombre" ILIKE '%agua%');
DELETE FROM "ProductoFoto"   WHERE "productoId" IN (SELECT "id" FROM "Producto" WHERE "nombre" ILIKE '%yo%' AND "nombre" ILIKE '%agua%');
DELETE FROM "PuntoProducto"  WHERE "productoId" IN (SELECT "id" FROM "Producto" WHERE "nombre" ILIKE '%yo%' AND "nombre" ILIKE '%agua%');
DELETE FROM "ReposicionItem" WHERE "productoId" IN (SELECT "id" FROM "Producto" WHERE "nombre" ILIKE '%yo%' AND "nombre" ILIKE '%agua%');

-- 2) Lo desactiva: desaparece de bodega, vendedor, caja, tienda y del dictado por voz.
UPDATE "Producto" SET "activo" = false, "publicarTienda" = false
WHERE "nombre" ILIKE '%yo%' AND "nombre" ILIKE '%agua%';

-- 3) Si no tiene historial (ventas/movimientos/producción/receta), lo borra del todo.
DELETE FROM "Producto" p
WHERE p."nombre" ILIKE '%yo%' AND p."nombre" ILIKE '%agua%'
  AND NOT EXISTS (SELECT 1 FROM "PedidoItem" x WHERE x."productoId" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "MovimientoStock" x WHERE x."productoId" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "OrdenProduccion" x WHERE x."productoId" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "RecetaItem" x WHERE x."productoId" = p."id");
