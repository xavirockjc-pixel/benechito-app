-- Distribución/reventa = solo Local: se ocultan de vendedor, bodega y producción
-- (que ya filtran soloLocal=false) y quedan en Local + panel para analizar ventas.
UPDATE "Producto" SET "soloLocal" = true
WHERE "tipo" = 'reventa' OR "seccion" = 'distribucion';
