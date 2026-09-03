// Plantillas por rubro: el MISMO sistema con el nombre de cada negocio.
// Cambia cómo se llaman las áreas/módulos y qué se muestra; el motor no cambia.

export type RubroId =
  | "fabrica" | "panaderia" | "comida_rapida" | "restaurante"
  | "heladeria" | "distribuidora" | "almacen" | "construccion" | "manufactura" | "consultoria";

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

/** Tema visual del rubro: colores e ícono característico (minimalista). */
export type TemaRubro = {
  primario: string;   // color principal de acciones/marca
  acento: string;     // color secundario/energía
  degradado: [string, string]; // gradiente de la marca (sidebar/sellos)
};

export type Rubro = {
  id: RubroId;
  nombre: string;
  emoji: string;
  labels: Etiquetas;
  tema: TemaRubro;
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
    tema: { primario: "#1479c4", acento: "#f28a1e", degradado: ["#f28a1e", "#d8a944"] },
    labels: { ...BASE },
    ocultar: [],
  },
  panaderia: {
    id: "panaderia",
    nombre: "Panadería",
    emoji: "🥖",
    tema: { primario: "#b45309", acento: "#d97706", degradado: ["#d97706", "#f59e0b"] },
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
    tema: { primario: "#dc2626", acento: "#f59e0b", degradado: ["#dc2626", "#f59e0b"] },
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
    tema: { primario: "#0f766e", acento: "#ca8a04", degradado: ["#0f766e", "#0d9488"] },
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
  heladeria: {
    id: "heladeria",
    nombre: "Heladería / Dulces",
    emoji: "🍦",
    tema: { primario: "#1479c4", acento: "#ff7aa2", degradado: ["#33abe6", "#1479c4"] },
    labels: { ...BASE, caja: "Local / Caja" },
    ocultar: [], // ecosistema completo (el caso demo)
  },
  distribuidora: {
    id: "distribuidora",
    nombre: "Distribuidora / Mayorista",
    emoji: "🚚",
    tema: { primario: "#2563eb", acento: "#f59e0b", degradado: ["#1d4ed8", "#3b82f6"] },
    labels: {
      ...BASE,
      bodega: "Bodega central",
      vendedor: "Vendedor",
      caja: "Local",
      rutas: "Rutas",
      reposiciones: "Reposición a clientes",
    },
    // No fabrica: se ocultan las áreas de producción/recetas.
    ocultar: ["/admin/produccion", "/admin/materias", "/admin/control-calidad", "/admin/higiene", "/admin/sabores"],
  },
  almacen: {
    id: "almacen",
    nombre: "Almacén / Minimarket",
    emoji: "🏪",
    tema: { primario: "#16a34a", acento: "#f59e0b", degradado: ["#15803d", "#22c55e"] },
    labels: { ...BASE, caja: "Caja / Mostrador", pos: "Mostrador" },
    // Solo vende y controla stock: sin producción, rutas ni reposiciones.
    ocultar: ["/admin/produccion", "/admin/materias", "/admin/control-calidad", "/admin/higiene",
      "/admin/formularios", "/admin/capacitaciones", "/admin/sabores", "/admin/reposiciones",
      "/admin/rutas", "/admin/repartos", "/admin/preventa"],
  },
  construccion: {
    id: "construccion",
    nombre: "Construcción",
    emoji: "🏗️",
    tema: { primario: "#ea580c", acento: "#facc15", degradado: ["#c2410c", "#f97316"] },
    labels: {
      ...BASE,
      bodega: "Bodega de materiales",
      vendedor: "Terreno",
      caja: "Oficina",
      rutas: "Despachos",
      retiros: "Solicitudes",
      pos: "Oficina",
    },
    // Materiales, clientes/deudas, cotización y facturación (no fabricación de alimentos).
    ocultar: ["/admin/produccion", "/admin/sabores", "/admin/materias", "/admin/control-calidad",
      "/admin/higiene", "/admin/formularios", "/admin/capacitaciones", "/admin/reposiciones"],
  },
  manufactura: {
    id: "manufactura",
    nombre: "Manufactura",
    emoji: "🏭",
    tema: { primario: "#475569", acento: "#f59e0b", degradado: ["#334155", "#64748b"] },
    labels: { ...BASE, sabores: "Líneas / SKU", surtidos: "Ensambles" },
    // Produce en serie con recetas y trazabilidad; sin rutas/reposiciones de terreno.
    ocultar: ["/admin/reposiciones", "/admin/rutas", "/admin/preventa"],
  },
  consultoria: {
    id: "consultoria",
    nombre: "Consultoría / Servicios",
    emoji: "💼",
    tema: { primario: "#7c3aed", acento: "#f59e0b", degradado: ["#6d28d9", "#8b5cf6"] },
    labels: { ...BASE, caja: "Recepción", vendedor: "Terreno", pos: "Recepción" },
    // Servicios con agenda: sin inventario/producción/reparto; foco en agenda, clientes y cobro.
    ocultar: ["/admin/produccion", "/admin/materias", "/admin/control-calidad", "/admin/higiene",
      "/admin/sabores", "/admin/inventario", "/admin/reposiciones", "/admin/rutas", "/admin/repartos",
      "/admin/preventa", "/admin/pos", "/admin/retiros", "/admin/productos", "/admin/precios", "/admin/novedades"],
  },
};

export const RUBROS_LISTA = Object.values(RUBROS);

export function rubroDe(id: string | null | undefined): Rubro {
  return RUBROS[(id as RubroId) ?? "fabrica"] ?? RUBROS.fabrica;
}
