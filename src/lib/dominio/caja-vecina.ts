// Caja Vecina: tipos de movimiento, signo sobre el efectivo, y detección por voz.

export const TIPOS_CV = ["apertura", "deposito", "pago", "comision", "giro", "retiro", "ajuste", "cierre"] as const;
export type TipoCV = (typeof TIPOS_CV)[number];

export const cvLabel: Record<string, string> = {
  apertura: "Apertura (efectivo inicial)",
  deposito: "Depósito (entra efectivo)",
  pago: "Pago de cuenta (entra efectivo)",
  comision: "Comisión ganada",
  giro: "Giro (sale efectivo)",
  retiro: "Retiro a banco (sale efectivo)",
  ajuste: "Ajuste",
  cierre: "Cierre del día",
};
export const cvIcono: Record<string, string> = {
  apertura: "🔓", deposito: "📥", pago: "💵", comision: "🎁", giro: "📤", retiro: "🏦", ajuste: "⚙️", cierre: "🔒",
};

/** Signo sobre el EFECTIVO en caja: entra (+), sale (−) o neutro (0). */
export function signoCV(tipo: string): 1 | -1 | 0 {
  if (tipo === "giro" || tipo === "retiro") return -1;
  if (tipo === "cierre") return 0; // el cierre no mueve el efectivo, solo registra
  return 1;
}

/** Detecta el tipo de movimiento por lo dictado. */
export function detectaTipoCV(t: string): TipoCV {
  if (/(apertura|abrir|inicio|inicial|arranco|empiezo con)/.test(t)) return "apertura";
  if (/(giro|girar|retiro de cliente|saco para el cliente|entrega efectivo|retira plata)/.test(t)) return "giro";
  if (/(deposito|deposita|deposit)/.test(t)) return "deposito";
  if (/(pago|paga|cuenta|servicio|luz|agua)/.test(t)) return "pago";
  if (/(comision|gane|ganancia)/.test(t)) return "comision";
  if (/(retiro a banco|llevar al banco|saco para depositar|retiro banco|deje en el banco)/.test(t)) return "retiro";
  return "ajuste";
}

/** Extrae el monto ("20 mil", "15000"). */
export function detectaMontoCV(t: string): number | null {
  const m = t.match(/(\d[\d.]*)\s*(mil)?/);
  if (!m) return null;
  let v = parseInt(m[1].replace(/\./g, ""), 10) || 0;
  if (m[2] === "mil" && v < 1000) v *= 1000;
  return v || null;
}

export function normalizaCV(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
