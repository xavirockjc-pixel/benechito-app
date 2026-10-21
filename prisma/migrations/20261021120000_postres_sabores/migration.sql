-- Crea los sabores de POSTRES (línea postres_500) para poder cargarlos por sabor
-- en bodega. Idempotente: no duplica si ya existen (por nombre+línea).

INSERT INTO "Sabor" ("id", "nombre", "linea", "seccion", "activo", "createdAt")
SELECT md5('postre_' || v.nombre), v.nombre, 'postres_500', 'helado', true, now()
FROM (VALUES
  ('Menta y Chocolate'),
  ('Choco Brownie'),
  ('Crema Coco y Chips'),
  ('Vainilla Oreo'),
  ('Crema de Maracuyá')
) AS v(nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM "Sabor" s WHERE s."nombre" = v.nombre AND s."linea" = 'postres_500'
);
