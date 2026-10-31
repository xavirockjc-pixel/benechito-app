-- Siembra los insumos consumibles y materiales base de Benechito en MateriaPrima.
-- Aparecen en Producción (🧴 Insumos), Bodega (🧪 Insumos) y el cerebro (admin/materias).
-- Idempotente (ON CONFLICT DO NOTHING). stock=0: se cargan al recibir en bodega.
-- categoria: insumo|material · subtipo: esencia|colorante|otro|base · unidad: kg|g|l|ml|unidad.

INSERT INTO "MateriaPrima" ("id","nombre","categoria","subtipo","unidad","stock","stockMinimo","activo","updatedAt")
VALUES
  -- Insumos (materias primas de la mezcla)
  ('mp_leche','Leche','insumo','base','l',0,0,true,now()),
  ('mp_azucar','Azúcar','insumo','otro','kg',0,0,true,now()),
  ('mp_estabilizante','Estabilizante','insumo','otro','kg',0,0,true,now()),
  ('mp_edulcorante','Edulcorante','insumo','otro','kg',0,0,true,now()),
  ('mp_esencia_vainilla','Esencia de vainilla','insumo','esencia','ml',0,0,true,now()),
  ('mp_esencia_frutilla','Esencia de frutilla','insumo','esencia','ml',0,0,true,now()),
  ('mp_esencia_chocolate','Esencia de chocolate','insumo','esencia','ml',0,0,true,now()),
  ('mp_esencia_platano','Esencia de plátano','insumo','esencia','ml',0,0,true,now()),
  ('mp_esencia_pina','Esencia de piña','insumo','esencia','ml',0,0,true,now()),
  ('mp_colorante','Colorante','insumo','colorante','ml',0,0,true,now()),
  -- Materiales (envases/consumibles de empaque)
  ('mp_palitos','Palitos de helado','material','otro','unidad',0,0,true,now()),
  ('mp_bolsas','Bolsas','material','otro','unidad',0,0,true,now()),
  ('mp_bolsas_surtido','Bolsa surtido','material','otro','unidad',0,0,true,now())
ON CONFLICT ("id") DO NOTHING;
