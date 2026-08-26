// Vehículo del reparto: tipos de gasto y checklist del chofer.

export const TIPOS_GASTO = ["combustible", "mantencion", "repuesto", "neumaticos", "peaje", "lavado", "otro"] as const;
export type TipoGasto = (typeof TIPOS_GASTO)[number];

export const tipoGastoLabel: Record<string, string> = {
  combustible: "Combustible",
  mantencion: "Mantención",
  repuesto: "Repuesto",
  neumaticos: "Neumáticos",
  peaje: "Peaje / TAG",
  lavado: "Lavado",
  otro: "Otro",
};

export const tipoGastoIcono: Record<string, string> = {
  combustible: "⛽",
  mantencion: "🔧",
  repuesto: "⚙️",
  neumaticos: "🛞",
  peaje: "🛣️",
  lavado: "🧼",
  otro: "💸",
};

// Puntos del checklist del chofer (revisión del vehículo).
export const CHECKLIST_VEHICULO: { campo: string; label: string; icono: string }[] = [
  { campo: "agua", label: "Agua / refrigerante", icono: "💧" },
  { campo: "aceite", label: "Aceite", icono: "🛢️" },
  { campo: "neumaticos", label: "Neumáticos", icono: "🛞" },
  { campo: "luces", label: "Luces", icono: "💡" },
  { campo: "frenos", label: "Frenos", icono: "🛑" },
  { campo: "limpieza", label: "Limpieza", icono: "🧼" },
  { campo: "documentos", label: "Documentos (permiso, seguro)", icono: "📄" },
];

export const ESTADOS_REVISION = ["ok", "revisar", "malo"] as const;
export const estadoRevisionLabel: Record<string, string> = { ok: "OK", revisar: "Revisar", malo: "Malo" };
export const estadoRevisionColor: Record<string, string> = { ok: "#16a34a", revisar: "#d97706", malo: "#dc2626" };
