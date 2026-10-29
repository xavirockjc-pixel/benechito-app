-- Precio por ZONA de ruta: columna nueva en ListaPrecio.
ALTER TABLE "ListaPrecio" ADD COLUMN "zona" TEXT;

-- ============================================================================
-- Productos de RUTA (mayorista). seccion='ruta' (no aparecen en caja/local),
-- tipo='propio' y soloLocal=false (sí aparecen en el vendedor), sin publicar en
-- tienda. Precios solo en las listas de zona de ruta (abajo).
-- ============================================================================
INSERT INTO "Producto" ("id","linea","nombre","formato","tipo","seccion","activo","soloLocal","publicarTienda","unidadesPack")
VALUES
  ('prod_ruta_tuyyo','helado','Tú y Yo','Bolsa 50','propio','ruta',true,false,false,50),
  ('prod_ruta_pal_leche','helado','Paletas de leche surtidas','Bolsa 50','propio','ruta',true,false,false,50),
  ('prod_ruta_pal_agua','helado','Paletas de agua surtidas','Bolsa 50','propio','ruta',true,false,false,50),
  ('prod_ruta_postre16','helado','Pack postre','Pack 16','propio','ruta',true,false,false,16)
ON CONFLICT ("id") DO NOTHING;

-- ============================================================================
-- Listas de precio por ZONA (canal 'reparto'). La columna 'zona' hace que se
-- apliquen automáticamente según la comuna del cliente mayorista/ruta.
-- ============================================================================
INSERT INTO "ListaPrecio" ("id","nombre","canal","zona","activo")
VALUES
  ('lista_ruta_coronel_lota','Ruta Coronel–Lota','reparto','coronel_lota',true),
  ('lista_ruta_metro','Ruta Metropolitano','reparto','metropolitano',true),
  ('lista_ruta_losangeles','Ruta Los Ángeles','reparto','los_angeles',true)
ON CONFLICT ("id") DO NOTHING;

-- ============================================================================
-- Precios por producto y zona (cantidadMinima=1). El modificador de aumento/
-- descuento por venta sigue disponible en el vendedor para ajustes caso a caso.
-- ============================================================================
INSERT INTO "PrecioProducto" ("id","productoId","listaId","precio","cantidadMinima")
VALUES
  -- Zona Coronel–Lota
  ('prc_tuyyo_cl','prod_ruta_tuyyo','lista_ruta_coronel_lota',14000,1),
  ('prc_palleche_cl','prod_ruta_pal_leche','lista_ruta_coronel_lota',10000,1),
  ('prc_palagua_cl','prod_ruta_pal_agua','lista_ruta_coronel_lota',7500,1),
  ('prc_postre_cl','prod_ruta_postre16','lista_ruta_coronel_lota',20800,1),
  -- Zona Metropolitano (San Pedro, Concepción, Chiguayante, Hualpén, Talcahuano)
  ('prc_tuyyo_mt','prod_ruta_tuyyo','lista_ruta_metro',15000,1),
  ('prc_palleche_mt','prod_ruta_pal_leche','lista_ruta_metro',11000,1),
  ('prc_palagua_mt','prod_ruta_pal_agua','lista_ruta_metro',8000,1),
  ('prc_postre_mt','prod_ruta_postre16','lista_ruta_metro',22000,1),
  -- Zona Los Ángeles (Santa Juana → Los Ángeles)
  ('prc_tuyyo_la','prod_ruta_tuyyo','lista_ruta_losangeles',16000,1),
  ('prc_palleche_la','prod_ruta_pal_leche','lista_ruta_losangeles',11000,1),
  ('prc_palagua_la','prod_ruta_pal_agua','lista_ruta_losangeles',8000,1),
  ('prc_postre_la','prod_ruta_postre16','lista_ruta_losangeles',22000,1)
ON CONFLICT ("id") DO NOTHING;
