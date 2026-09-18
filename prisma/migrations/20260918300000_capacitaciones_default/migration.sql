-- Capacitaciones por defecto para Producción, adaptadas a Benechito (máquinas y
-- procesos), con control de calidad DIVIDIDO por área (helados / trufas / cuchuflíes).
-- Idempotente (por id). El video se agrega/edita desde el panel (Capacitaciones).

INSERT INTO "Capacitacion" ("id","titulo","descripcion","categoria","rol","pasos","orden","activo") VALUES
(
  'cap_manipulacion',
  'Manipulación de alimentos (obligatoria)',
  'Lo básico para manipular con seguridad la mezcla, los helados y los dulces.',
  'manipulacion','produccion',
  E'1) Lavado de manos: agua y jabón 20 seg, al empezar, entre tareas y al salir del baño. Secar con toalla desechable.\n2) Presentación: cofia (pelo tomado), delantal limpio, uñas cortas sin esmalte, sin joyas ni reloj.\n3) Salud: con diarrea, vómitos, heridas en manos o resfrío, avisa y no manipules alimentos.\n4) Cadena de frío: la mezcla y el helado no deben quedar fuera de la cámara más de lo necesario. Producto terminado a -18°C o menos.\n5) Contaminación cruzada: utensilios y recipientes limpios por producto; no mezclar los de una cosa con otra.\n6) Prueba de sabor: cuchara limpia cada vez, nunca la misma dos veces.',
  1,true
),
(
  'cap_higiene',
  'Higiene y sanitización del área',
  'Cómo dejar limpia y sanitizada el área, las superficies y las máquinas.',
  'higiene','produccion',
  E'1) Antes de empezar: sanitiza mesones, utensilios y máquinas con la solución indicada.\n2) Durante el turno: mantén el área ordenada y limpia los derrames al momento.\n3) Pisos secos para evitar caídas; señaliza si está mojado.\n4) Al cerrar: lava y sanitiza todo, retira la basura y guarda los insumos tapados y rotulados.\n5) Químicos de limpieza: rotulados, lejos de los alimentos y usando guantes.',
  2,true
),
(
  'cap_seguridad',
  'Seguridad laboral y EPP',
  'Prevención de accidentes con frío, calor, chocolate y máquinas.',
  'seguridad','produccion',
  E'1) EPP: cofia, delantal, calzado antideslizante; guantes térmicos para la cámara y el chocolate caliente.\n2) Cámara de frío: no permanezcas solo mucho rato; aprende a abrir desde adentro.\n3) Calor: cuidado con quemaduras al bañar chocolate o freír; no dejes mangos hacia afuera.\n4) Electricidad: manos secas al operar máquinas; reporta cables o enchufes dañados.\n5) Cortes o quemaduras: usa el botiquín y avisa de inmediato al encargado.',
  3,true
),
(
  'cap_residuos',
  'Manejo de residuos',
  'Cómo separar y desechar bien los residuos de producción.',
  'residuos','produccion',
  E'1) Separa: orgánicos (restos de leche, fruta, manjar), plásticos (bolsas, moldes malos), cartón y vidrio.\n2) Chocolate y aceites: no botar por el lavaplatos; junta en un recipiente y desecha aparte.\n3) Basura tapada y retirada al final del turno; no acumular.\n4) Reutiliza lo que sirva (baldes limpios) y recicla plástico y cartón.',
  4,true
),
(
  'cap_maquinas',
  'Uso y limpieza de máquinas',
  'Operación segura y limpieza de las máquinas de producción.',
  'maquinas','produccion',
  E'1) Antes de usar: revisa que esté limpia y armada correctamente.\n2) Mezcladora / pasteurizadora: nunca metas manos ni utensilios con la máquina andando.\n3) Mantecadora / paletera: respeta los tiempos; apaga antes de retirar el producto.\n4) Selladora de bolsas: cuidado con la resistencia caliente.\n5) Al terminar: apaga, desconecta, desarma las piezas y lava; seca antes de guardar.\n6) Si suena raro o falla, apágala y avisa; no la fuerces.',
  5,true
),
(
  'cap_calidad_helados',
  'Control de calidad: Helados (Tú y yo / paletas)',
  'Qué revisar para que el helado salga bien.',
  'calidad','produccion',
  E'1) Mezcla: sin grumos, bien pasteurizada y fría antes de mantecar.\n2) Textura: cremosa, sin cristales de hielo; aire (overrun) parejo.\n3) Temperatura: mantecado al punto y congelado a -18°C o menos.\n4) Moldes / paletas: llenado parejo, palito centrado, desmolde limpio.\n5) Envasado: bolsa bien sellada, sin aire, rotulada (sabor, fecha, lote).\n6) Rechaza lo que tenga cristales, sabor raro o mal sellado.',
  6,true
),
(
  'cap_calidad_trufas',
  'Control de calidad: Trufas',
  'Qué revisar en el bañado y terminación de las trufas.',
  'calidad','produccion',
  E'1) Temperado del chocolate: brillo y quiebre firme; ni muy caliente ni muy frío.\n2) Cobertura pareja, sin fisuras ni burbujas; base limpia.\n3) Tamaño y peso uniforme.\n4) Refrigeración adecuada para que endurezca; sin blanqueo (manchas blancas).\n5) Empaque limpio, rotulado con fecha y lote.',
  7,true
),
(
  'cap_calidad_cuchufli',
  'Control de calidad: Cuchuflíes',
  'Qué revisar para mantener la oblea crocante y el relleno parejo.',
  'calidad','produccion',
  E'1) Oblea crocante y seca; sin humedad que la ablande.\n2) Relleno de manjar uniforme, sin exceso que rebase.\n3) Cierre parejo; largo y grosor uniforme.\n4) Guardar en lugar seco y hermético para mantener la crocancia.\n5) Rechaza obleas blandas, quebradas o con relleno disparejo.',
  8,true
)
ON CONFLICT ("id") DO NOTHING;
