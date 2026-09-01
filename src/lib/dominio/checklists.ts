// Dominio de Checklists/BPM y Capacitaciones (extensión 17).

export const CATEGORIAS_FORM = ["higiene", "seguridad", "limpieza", "temperatura", "logistica", "revision", "bpm", "personal"] as const;
export const categoriaFormLabel: Record<string, string> = {
  higiene: "Higiene",
  seguridad: "Seguridad",
  limpieza: "Limpieza",
  temperatura: "Temperaturas",
  logistica: "Logística",
  revision: "Revisión",
  bpm: "BPM",
  personal: "Personal",
};
export const categoriaFormIcon: Record<string, string> = {
  higiene: "🧼", seguridad: "🦺", limpieza: "🧽", temperatura: "🌡️",
  logistica: "📦", revision: "🔧", bpm: "✅", personal: "👤",
};

export const ROLES_FORM = ["todos", "produccion", "bodega", "caja", "vendedor"] as const;
export const rolFormLabel: Record<string, string> = {
  todos: "Todas las apps",
  produccion: "Producción",
  bodega: "Bodega",
  caja: "Local / Caja",
  vendedor: "Vendedor",
};

export const FRECUENCIAS = ["diaria", "semanal", "por_evento", "una_vez"] as const;
export const frecuenciaLabel: Record<string, string> = {
  diaria: "Diaria", semanal: "Semanal", por_evento: "Por evento", una_vez: "Una vez",
};

export const TIPOS_CAMPO = ["si_no", "texto", "numero", "opcion"] as const;
export const tipoCampoLabel: Record<string, string> = {
  si_no: "Sí / No", texto: "Texto", numero: "Número", opcion: "Opciones",
};

export type CampoForm = { id: string; label: string; tipo: string; requerido?: boolean; opciones?: string[] };

/** Parsea el JSON de campos de una plantilla de forma segura. */
export function parseCampos(json: string | null | undefined): CampoForm[] {
  try {
    const a = JSON.parse(json ?? "[]");
    return Array.isArray(a) ? (a as CampoForm[]) : [];
  } catch {
    return [];
  }
}

/** Parsea las respuestas guardadas {campoId: valor}. */
export function parseRespuestas(json: string | null | undefined): Record<string, string> {
  try {
    const o = JSON.parse(json ?? "{}");
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

export const CATEGORIAS_CAP = ["fabricacion", "maquinas", "receta", "otro"] as const;
export const categoriaCapLabel: Record<string, string> = {
  fabricacion: "Fabricación", maquinas: "Uso de máquinas", receta: "Receta", otro: "Otro",
};

/** Convierte un enlace de YouTube/Drive en URL embebible (o null si no reconoce). */
export function urlEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const drive = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  return null;
}
