// Plantillas por rubro: el MISMO sistema con el nombre de cada negocio.
// Cambia cómo se llaman las áreas/módulos y qué se muestra; el motor no cambia.

export type RubroId = "fabrica" | "panaderia" | "comida_rapida" | "restaurante";

/** Etiquetas configurables por rubro (nombres de áreas y módulos). */
export type Etiquetas = {
  produccion: string;   // app/área de fabricación
  bodega: string;       // app/área de almacenamiento
  sabores: string;      // catálogo de líneas/sabores
  surtidos: string;     // armado de mezclas/combos
  vendedor: string;     // app de terreno
  caja: string;         // app de sala/mostrador
  reposiciones: string; // reposición a puntos
  rutas: string;        // ruta de reparto
  retiros: string;      // pedidos entrantes por redes
  pos: string;          // punto de venta directo
  materias: string;     // materias primas
};

export type Rubro = {
  id: RubroId;
  nombre: string;
  emoji: string;
  labels: Etiquetas;
  /** Rutas de módulos a ocultar del menú para este rubro. */
  ocultar: string[];
};

// Rubro base = fábrica (los nombres actuales de Benechito).
const BASE: Etiquetas = {
  produccion: "Producción",
  bodega: "Bodega",
  sabores: "Sabores",
  surtidos: "Surtidos",
  vendedor: "Vendedor",
  caja: "Local / Caja",
  reposiciones: "Reposiciones",
  rutas: "Rutas",
  retiros: "Retiros",
  pos: "Punto de venta",
  materias: "Materias primas",
};

export const RUBROS: Record<RubroId, Rubro> = {
  fabrica: {
    id: "fabrica",
    nombre: "Fábrica / Producción",
    emoji: "🏭",
    labels: { ...BASE },
    ocultar: [],
  },
  panaderia: {
    id: "panaderia",
    nombre: "Panadería",
    emoji: "🥖",
    labels: {
      ...BASE,
      produccion: "Horno",
      bodega: "Despensa",
      sabores: "Tipos de pan",
      surtidos: "Bandejas",
      vendedor: "Reparto",
      caja: "Mostrador",
      reposiciones: "Reparto a tiendas",
      retiros: "Encargos",
      pos: "Mostrador",
    },
    ocultar: [],
  },
  comida_rapida: {
    id: "comida_rapida",
    nombre: "Comida rápida",
    emoji: "🍔",
    labels: {
      ...BASE,
      produccion: "Cocina",
      bodega: "Almacén",
      sabores: "Menú",
      surtidos: "Combos",
      vendedor: "Delivery",
      caja: "Mostrador",
      reposiciones: "Reposición",
      retiros: "Pickup / Delivery",
      pos: "Mostrador",
    },
    ocultar: ["/admin/reposiciones"],
  },
  restaurante: {
    id: "restaurante",
    nombre: "Restaurante",
    emoji: "🍽️",
    labels: {
      ...BASE,
      produccion: "Cocina",
      bodega: "Bodega / Cava",
      sabores: "Platos",
      surtidos: "Combos",
      vendedor: "Reparto",
      caja: "Salón / Caja",
      reposiciones: "Reposición",
      rutas: "Reparto",
      retiros: "Reservas / Pickup",
      pos: "Salón / Caja",
    },
    ocultar: ["/admin/rutas", "/admin/reposiciones"],
  },
};

export const RUBROS_LISTA = Object.values(RUBROS);

export function rubroDe(id: string | null | undefined): Rubro {
  return RUBROS[(id as RubroId) ?? "fabrica"] ?? RUBROS.fabrica;
}
