// Dominio: inventario multiubicación. El stock vive POR ubicación (bodega, sala, vehículo).
// Cargar un vehículo es una TRANSFERENCIA, no una venta. Ver ARQUITECTURA-ECOSYSTEM.md §4.4.

export const TIPOS_MOVIMIENTO = ["ingreso", "transferencia", "merma", "ajuste"] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export const tipoMovimientoLabel: Record<string, string> = {
  ingreso: "Ingreso (compra/producción)",
  transferencia: "Transferencia (cargar vehículo)",
  merma: "Merma / baja",
  ajuste: "Ajuste de inventario",
  venta: "Venta",
  produccion: "Producción",
};

export const tipoUbicacionLabel: Record<string, string> = {
  bodega: "Bodega",
  sala: "Sala de ventas",
  vehiculo: "Vehículo",
  otro: "Otro",
};
