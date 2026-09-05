// Liquidación flexible por MODALIDAD de pago. Estimación bruta (sin imposiciones).
// Modalidades: mensual | semanal | por_dia | por_hora | por_jornada | por_trato.

export const HORAS_JORNADA = 6; // una jornada = 6 horas

export const MODALIDADES_PAGO = ["mensual", "semanal", "por_dia", "por_hora", "por_jornada", "por_trato"] as const;
export type ModalidadPago = (typeof MODALIDADES_PAGO)[number];

export const modalidadLabel: Record<string, string> = {
  mensual: "Sueldo mensual",
  semanal: "Por semana",
  por_dia: "Por día trabajado",
  por_hora: "Por hora",
  por_jornada: "Por jornada (6 h)",
  por_trato: "Por trato (producción)",
};
/** Cómo se llama la tarifa de cada modalidad. */
export const tarifaLabel: Record<string, string> = {
  mensual: "$ por mes",
  semanal: "$ por semana",
  por_dia: "$ por día",
  por_hora: "$ por hora",
  por_jornada: "$ por jornada",
  por_trato: "$ por unidad producida",
};

export type MovLiq = { tipo: string; monto: number };

export type Liquidacion = {
  base: number;            // ganado por la modalidad en el período
  detalleBase: string;     // ej "6 días × $15.000" o "38 h × $2.500"
  extrasBonos: number;     // bonos + horas extra (movimientos +)
  descuentosAdelantos: number; // adelantos + descuentos (movimientos −)
  liquido: number;
};

const clp = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

/**
 * Calcula la liquidación del período según la modalidad y los datos contados.
 * `unidades` trae lo que se contó del período: días, horas, jornadas, semanas y trato ($).
 */
export function liquidar(input: {
  modalidad: string;
  tarifa: number;             // valor de la tarifa (según modalidad; en por_trato = $ por unidad)
  dias: number;               // días trabajados en el período
  horas: number;              // horas en el período
  semanas: number;            // nº de semanas del período (1 si es vista semana)
  tratoMonto: number;         // suma de "trato" registrado a mano en el período
  unidadesProduccion: number; // unidades que el trabajador produjo (por voz) en el período
  movimientos: MovLiq[];      // bonos/adelantos/etc del período
}): Liquidacion {
  const { modalidad, tarifa, dias, horas, semanas, tratoMonto, unidadesProduccion, movimientos } = input;
  const jornadas = HORAS_JORNADA > 0 ? horas / HORAS_JORNADA : 0;

  let base = 0;
  let detalleBase = "";
  switch (modalidad) {
    case "por_dia":
      base = Math.round(tarifa * dias);
      detalleBase = `${dias} día(s) × ${clp(tarifa)}`;
      break;
    case "por_hora":
      base = Math.round(tarifa * horas);
      detalleBase = `${horas.toFixed(0)} h × ${clp(tarifa)}`;
      break;
    case "por_jornada":
      base = Math.round(tarifa * jornadas);
      detalleBase = `${jornadas.toFixed(1)} jornada(s) × ${clp(tarifa)}`;
      break;
    case "semanal":
      base = Math.round(tarifa * semanas);
      detalleBase = semanas === 1 ? `1 semana × ${clp(tarifa)}` : `${semanas} semanas × ${clp(tarifa)}`;
      break;
    case "por_trato": {
      // Automático: unidades producidas (por voz, divididas si trabajaron varios) × valor + trato manual.
      const auto = Math.round(tarifa * unidadesProduccion);
      base = auto + tratoMonto;
      const uFmt = Number.isInteger(unidadesProduccion) ? String(unidadesProduccion) : unidadesProduccion.toFixed(1);
      detalleBase = unidadesProduccion > 0
        ? `${uFmt} u. × ${clp(tarifa)}${tratoMonto ? ` + trato ${clp(tratoMonto)}` : ""}`
        : (tratoMonto ? `trato registrado ${clp(tratoMonto)}` : `sin producción en el período`);
      break;
    }
    case "mensual":
    default:
      base = Math.round(tarifa * (semanas > 0 ? 1 : 1)); // el mes completo
      detalleBase = `sueldo del mes`;
      break;
  }

  // Bonos/extras (+) y adelantos/descuentos (−). Para "por_trato" el trato ya es la base.
  const extrasBonos = movimientos
    .filter((m) => m.tipo === "bono" || m.tipo === "hora_extra" || (m.tipo === "trato" && modalidad !== "por_trato"))
    .reduce((s, m) => s + m.monto, 0);
  const descuentosAdelantos = movimientos
    .filter((m) => m.tipo === "adelanto" || m.tipo === "descuento")
    .reduce((s, m) => s + m.monto, 0);

  const liquido = Math.max(0, base + extrasBonos - descuentosAdelantos);
  return { base, detalleBase, extrasBonos, descuentosAdelantos, liquido };
}

// ---- Rango de período (semana o mes) ----
export function mesActualStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "2026-09" → {inicio, fin, label} del mes. (Lo usa el Ayudante de IVA.) */
export function rangoMes(mesStr: string) {
  const [y, m] = mesStr.split("-").map(Number);
  const inicio = new Date(y, m - 1, 1);
  const fin = new Date(y, m, 1);
  const label = inicio.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  return { inicio, fin, label };
}

/** Navega meses: mesStr ± n. */
export function sumarMes(mesStr: string, n: number) {
  const [y, m] = mesStr.split("-").map(Number);
  return mesActualStr(new Date(y, m - 1 + n, 1));
}

/** Devuelve inicio/fin/label/semanas del período pedido, desplazado `off`. */
export function rangoPeriodo(periodo: string, off: number) {
  const hoy = new Date();
  if (periodo === "semana") {
    // Lunes de la semana actual + off semanas
    const d = new Date(hoy); d.setHours(0, 0, 0, 0);
    const dow = (d.getDay() + 6) % 7; // 0 = lunes
    const inicio = new Date(d); inicio.setDate(d.getDate() - dow + off * 7);
    const fin = new Date(inicio); fin.setDate(inicio.getDate() + 7);
    const finVis = new Date(fin); finVis.setDate(fin.getDate() - 1);
    const fmt = (x: Date) => x.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
    return { inicio, fin, label: `${fmt(inicio)} – ${fmt(finVis)}`, semanas: 1, esSemana: true };
  }
  // mes
  const base = new Date(hoy.getFullYear(), hoy.getMonth() + off, 1);
  const inicio = new Date(base.getFullYear(), base.getMonth(), 1);
  const fin = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  const diasMes = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const semanas = Math.round(diasMes / 7); // ≈ 4-5, para pagos semanales vistos en el mes
  const label = inicio.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  return { inicio, fin, label, semanas, esSemana: false };
}
