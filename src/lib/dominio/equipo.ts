// Equipo / trabajadores: cargos y movimientos de cuenta.

export const CARGOS = ["operario", "vendedor", "repartidor", "otro"] as const;
export type Cargo = (typeof CARGOS)[number];
export const cargoLabel: Record<string, string> = {
  operario: "Operario",
  vendedor: "Vendedor",
  repartidor: "Repartidor",
  otro: "Otro",
};
export const cargoIcono: Record<string, string> = {
  operario: "🏭",
  vendedor: "🚚",
  repartidor: "🚙",
  otro: "👤",
};

/** Roles de login que corresponden a cada cargo (para enlazar según rubro). */
export function rolesDeCargo(cargo: string): string[] {
  switch (cargo) {
    case "operario": return ["produccion"];
    case "vendedor": return ["vendedor"];
    case "repartidor": return ["chofer", "vendedor"];
    default: return ["produccion", "vendedor", "chofer", "caja", "bodega", "propietario", "admin"];
  }
}

// Movimientos de la cuenta del trabajador.
export const TIPOS_MOV_TRABAJADOR = ["pago", "adelanto", "deuda", "hora_extra", "bono", "descuento"] as const;
export type TipoMovTrabajador = (typeof TIPOS_MOV_TRABAJADOR)[number];
export const tipoMovTrabajadorLabel: Record<string, string> = {
  pago: "Pago",
  adelanto: "Adelanto",
  deuda: "Queda debiendo",
  hora_extra: "Horas extra",
  bono: "Bono",
  descuento: "Descuento",
};
export const tipoMovTrabajadorIcono: Record<string, string> = {
  pago: "💵",
  adelanto: "🤝",
  deuda: "📌",
  hora_extra: "⏱️",
  bono: "🎁",
  descuento: "➖",
};

/**
 * Signo del movimiento sobre lo que la EMPRESA le debe al trabajador.
 * + = suma a su favor (le deben más): hora_extra, bono.
 * − = baja lo que se le debe (ya recibió o descuenta): pago, adelanto, deuda, descuento.
 * (pago = se le pagó; adelanto = recibió antes; deuda = el trabajador debe; descuento = se le resta)
 */
export function signoMovTrabajador(tipo: string): 1 | -1 {
  return tipo === "hora_extra" || tipo === "bono" ? 1 : -1;
}
