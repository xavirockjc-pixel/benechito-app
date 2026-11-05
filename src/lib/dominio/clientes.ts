// Detección de clientes "dormidos": compraban seguido y dejaron de comprar.
// Heurística: con al menos 2 compras, se considera dormido si lleva más días sin
// comprar que su ritmo habitual (1.8× el intervalo promedio entre compras), con un
// piso de 21 días para no marcar como dormido a quien compra muy seguido.

const DIA = 86400000;
const PISO_DIAS = 21;

/** Días (enteros) entre dos fechas. */
export function diasEntre(a: Date, b: Date): number {
  return Math.floor((b.getTime() - new Date(a).getTime()) / DIA);
}

/**
 * ¿El cliente está dormido? `primera`/`ultima` = fechas de su primera y última
 * compra, `n` = nº de compras, `ahora` = referencia (hoy).
 */
export function esDormido(primera: Date | null, ultima: Date | null, n: number, ahora: Date): boolean {
  if (!ultima || !primera || n < 2) return false;
  const diasSin = diasEntre(ultima, ahora);
  const intervalo = diasEntre(primera, ultima) / (n - 1); // ritmo habitual
  const umbral = Math.max(PISO_DIAS, Math.round(intervalo * 1.8));
  return diasSin > umbral;
}
