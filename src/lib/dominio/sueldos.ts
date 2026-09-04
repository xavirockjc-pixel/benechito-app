// Liquidación simple (estimación bruta). NO calcula imposiciones legales
// (AFP/salud/cesantía/mutual): eso se exporta a Previred/contador.

export const RECARGO_EXTRA = 1.5; // recargo referencial de horas extra (50%)

export type MovLiq = { tipo: string; monto: number };

export type Liquidacion = {
  base: number;
  extrasBonos: number;          // horas extra + bonos (movimientos +)
  descuentosAdelantos: number;  // adelantos + descuentos (movimientos −)
  liquido: number;              // estimación bruta a pagar
  horasNormales: number;
  horasExtra: number;
  extraSugerido: number;        // referencia: horasExtra × valorHora × recargo
  baseDeHoras: boolean;         // true si la base se calculó por horas (sin sueldo fijo)
};

/**
 * Calcula la liquidación estimada del mes a partir de datos ya sumados.
 * base = sueldoBase (si existe) o valorHora × horas normales.
 * líquido = base + (horas extra registradas como movimiento + bonos) − (adelantos + descuentos).
 */
export function liquidar(input: {
  sueldoBase: number | null;
  valorHora: number | null;
  horasNormales: number;
  horasExtra: number;
  movimientos: MovLiq[];
}): Liquidacion {
  const { sueldoBase, valorHora, horasNormales, horasExtra, movimientos } = input;
  const vh = valorHora ?? 0;
  const baseDeHoras = !(sueldoBase && sueldoBase > 0);
  const base = baseDeHoras ? Math.round(vh * horasNormales) : Number(sueldoBase);

  const extrasBonos = movimientos
    .filter((m) => m.tipo === "hora_extra" || m.tipo === "bono")
    .reduce((s, m) => s + m.monto, 0);
  const descuentosAdelantos = movimientos
    .filter((m) => m.tipo === "adelanto" || m.tipo === "descuento")
    .reduce((s, m) => s + m.monto, 0);

  const liquido = Math.max(0, base + extrasBonos - descuentosAdelantos);
  const extraSugerido = Math.round(horasExtra * vh * RECARGO_EXTRA);

  return { base, extrasBonos, descuentosAdelantos, liquido, horasNormales, horasExtra, extraSugerido, baseDeHoras };
}

/** "2026-09" → {inicio, fin, label} del mes. */
export function rangoMes(mesStr: string) {
  const [y, m] = mesStr.split("-").map(Number);
  const inicio = new Date(y, m - 1, 1);
  const fin = new Date(y, m, 1);
  const label = inicio.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  return { inicio, fin, label };
}

export function mesActualStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Navega meses: mesStr ± n. */
export function sumarMes(mesStr: string, n: number) {
  const [y, m] = mesStr.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return mesActualStr(d);
}
