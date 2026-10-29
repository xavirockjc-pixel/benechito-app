-- Une comunas/sectores escritos distinto por mayúsculas/espacios (Lota=LOTA=lota).
-- initcap() deja "Título" y trim() quita espacios; así quedan en un único formato.
UPDATE "Negocio"
  SET comuna = initcap(trim(comuna))
  WHERE comuna IS NOT NULL AND comuna <> '' AND comuna <> initcap(trim(comuna));

UPDATE "Negocio"
  SET sector = initcap(trim(sector))
  WHERE sector IS NOT NULL AND sector <> '' AND sector <> initcap(trim(sector));
