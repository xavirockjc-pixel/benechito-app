-- Producto de RUTA: Balde de 5 litros (helado, cualquier sabor), $13.000 la unidad.
-- Se vende por unidad (unidadesPack = NULL), aparece solo en el app vendedor
-- (seccion='ruta', soloLocal=false, sin publicar en tienda). El aumento/descuento
-- por venta del vendedor sigue disponible para ajustar según la ruta/reparto.
INSERT INTO "Producto" ("id","linea","nombre","formato","tipo","seccion","activo","soloLocal","publicarTienda","unidadesPack")
VALUES
  ('prod_ruta_balde5','helado','Balde 5 litros','Balde 5 L','propio','ruta',true,false,false,NULL)
ON CONFLICT ("id") DO NOTHING;

-- Precio por zona (cantidadMinima=1): $13.000 por balde en las tres rutas.
INSERT INTO "PrecioProducto" ("id","productoId","listaId","precio","cantidadMinima")
VALUES
  ('prc_balde5_cl','prod_ruta_balde5','lista_ruta_coronel_lota',13000,1),
  ('prc_balde5_mt','prod_ruta_balde5','lista_ruta_metro',13000,1),
  ('prc_balde5_la','prod_ruta_balde5','lista_ruta_losangeles',13000,1)
ON CONFLICT ("id") DO NOTHING;
