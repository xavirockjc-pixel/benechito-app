-- Checklists BPM por defecto para Producción (higiene y calidad adaptados a Benechito).
-- Idempotente: si ya existen (por id), no se duplican. La central puede editarlos/desactivarlos
-- desde el panel (Checklists / BPM) sin que esto los vuelva a crear.

INSERT INTO "Formulario" ("id", "nombre", "categoria", "rol", "frecuencia", "campos", "orden") VALUES
(
  'bpm_higiene_personal',
  'Higiene personal (inicio de turno)',
  'higiene', 'produccion', 'diaria',
  '[{"id":"cofia","label":"Cofia puesta (pelo tomado)","tipo":"si_no"},{"id":"manos","label":"Manos lavadas y sanitizadas","tipo":"si_no"},{"id":"uniforme","label":"Delantal/uniforme limpio","tipo":"si_no"},{"id":"unas","label":"Sin joyas y unas cortas","tipo":"si_no"},{"id":"salud","label":"Sin sintomas de resfrio o malestar","tipo":"si_no"}]',
  1
),
(
  'bpm_limpieza',
  'Limpieza de utensilios y area',
  'limpieza', 'produccion', 'diaria',
  '[{"id":"utensilios","label":"Utensilios lavados y sanitizados","tipo":"si_no"},{"id":"mesones","label":"Mesones y superficies sanitizados","tipo":"si_no"},{"id":"maquinas","label":"Maquinas limpias","tipo":"si_no"},{"id":"pisos","label":"Pisos limpios","tipo":"si_no"},{"id":"basura","label":"Basura retirada","tipo":"si_no"}]',
  2
),
(
  'bpm_temperaturas',
  'Control de temperaturas',
  'temperatura', 'produccion', 'diaria',
  '[{"id":"camara","label":"Temperatura camara de frio (C)","tipo":"numero"},{"id":"congelador","label":"Temperatura congelador (C)","tipo":"numero"},{"id":"obs_temp","label":"Observacion","tipo":"texto"}]',
  3
),
(
  'bpm_cierre',
  'Cierre de produccion (BPM)',
  'bpm', 'produccion', 'diaria',
  '[{"id":"insumos","label":"Insumos guardados y tapados","tipo":"si_no"},{"id":"equipos","label":"Equipos apagados","tipo":"si_no"},{"id":"orden","label":"Area ordenada","tipo":"si_no"},{"id":"obs_cierre","label":"Observaciones del turno","tipo":"texto"}]',
  4
)
ON CONFLICT ("id") DO NOTHING;
