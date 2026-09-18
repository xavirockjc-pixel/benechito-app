-- Corrige el control de calidad: Tú y yo / paletas es línea de MOLDEO (leche,
-- azúcar, estabilizante → maduración → división de sabores → molde → desmolde →
-- envasado), SIN overrun ni batido. Las CREMAS sí llevan pasteurizado, maduración
-- y batido con overrun en la mantecadora. Se separa la maduración como paso propio.

UPDATE "Capacitacion" SET
  "titulo" = 'Control de calidad: Tú y yo / paletas',
  "descripcion" = 'Línea de moldeo (leche, azúcar y estabilizante). No lleva overrun ni batido en la mantecadora.',
  "pasos" = E'1) Base: solo leche, azúcar y estabilizante; bien disuelto, sin grumos.\n2) Maduración: deja madurar la mezcla el tiempo indicado (mejora textura y estabilidad). NO se bate ni va a la mantecadora.\n3) División de sabores: reparte la base madurada por sabor (depósitos/baldes) con la dosis correcta de esencia, color o fruta.\n4) Moldeo: llena los moldes parejo; palito centrado (paletas).\n5) Congelado: a -18°C o menos hasta que endurezca.\n6) Desmoldado: limpio, sin quebrar; descarta los mal formados.\n7) Envasado: bolsa bien sellada, sin aire, rotulada (sabor, fecha, lote).\n8) Rechaza: cristales de hielo, sabor raro, mal sellado o desmolde roto.'
WHERE "id" = 'cap_calidad_helados';

INSERT INTO "Capacitacion" ("id","titulo","descripcion","categoria","rol","pasos","orden","activo") VALUES
(
  'cap_calidad_cremas',
  'Control de calidad: Cremas (helado batido)',
  'Línea de helado batido: pasteurizado, maduración y batido con overrun en la mantecadora.',
  'calidad','produccion',
  E'1) Base: pasteurizada (calentar y enfriar según norma) para que sea inocua.\n2) Maduración: deja madurar la mezcla el tiempo indicado (mejora cuerpo y cremosidad).\n3) Mantecado / batido: lleva la base a la mantecadora e incorpora aire (overrun) parejo hasta el punto.\n4) Overrun: controla que el aire no sea excesivo ni escaso (afecta rendimiento y textura).\n5) Textura: cremosa, sin cristales de hielo.\n6) Endurecido: llévala a -18°C o menos.\n7) Envasado: potes o bolsas sellados y rotulados (sabor, fecha, lote).\n8) Rechaza: cristales, exceso o falta de aire, sabor raro o mal sellado.',
  6,true
)
ON CONFLICT ("id") DO NOTHING;
