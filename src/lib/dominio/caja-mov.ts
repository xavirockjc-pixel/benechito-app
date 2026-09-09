// Movimientos de dinero de la Caja Local: entra o sale, con un motivo.
// Las compras/pagos quedan además como gasto del LOCAL (origen "caja_local").

export type MotivoCaja = {
  key: string; label: string; icon: string; tipo: "ingreso" | "egreso";
  gasto?: boolean; categoria?: string;
};

export const MOTIVOS_CAJA: MotivoCaja[] = [
  // Entra dinero
  { key: "sencillo", label: "Sencillo / vuelto", icon: "🪙", tipo: "ingreso" },
  { key: "aporte", label: "Ingreso extra", icon: "➕", tipo: "ingreso" },
  // Sale dinero
  { key: "compra", label: "Compra insumos", icon: "🛒", tipo: "egreso", gasto: true, categoria: "insumos" },
  { key: "pago", label: "Pago", icon: "💸", tipo: "egreso", gasto: true, categoria: "otros" },
  { key: "retiro", label: "Retiro / vuelto", icon: "📤", tipo: "egreso" },
  { key: "otro", label: "Otro", icon: "⚙️", tipo: "egreso" },
];

export const motivoDe = (key: string) => MOTIVOS_CAJA.find((m) => m.key === key);

export function normalizaCajaMov(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Detecta el motivo por lo dictado. */
export function detectaMotivoCaja(t: string): string {
  if (/(compra|comprar|insumo|mercaderia|proveedor)/.test(t)) return "compra";
  if (/(pago|pagar|cuenta|servicio|flete|arriendo|luz|agua)/.test(t)) return "pago";
  if (/(sencillo|vuelto|cambio)/.test(t)) return "sencillo";
  if (/(aporte|ingreso|agrego|meto|deposito)/.test(t)) return "aporte";
  if (/(retiro|saco|saqué|saque)/.test(t)) return "retiro";
  return "compra";
}

/** Extrae el monto ("20 mil", "5000"). */
export function detectaMontoCaja(t: string): number | null {
  const m = t.match(/(\d[\d.]*)\s*(mil)?/);
  if (!m) return null;
  let v = parseInt(m[1].replace(/\./g, ""), 10) || 0;
  if (m[2] === "mil" && v < 1000) v *= 1000;
  return v || null;
}
