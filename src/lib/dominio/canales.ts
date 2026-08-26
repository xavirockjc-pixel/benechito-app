import { prisma } from "@/lib/prisma";

// Canales de venta por defecto (se siembran la primera vez). El usuario puede
// agregar/editar los suyos desde /admin/ventas/canales.
export const CANALES_DEFAULT: { codigo: string; nombre: string; color: string; orden: number }[] = [
  { codigo: "local", nombre: "Local / Sala", color: "#0f7a44", orden: 1 },
  { codigo: "web", nombre: "Web", color: "#7c3aed", orden: 2 },
  { codigo: "delivery", nombre: "Delivery", color: "#dc2626", orden: 3 },
  { codigo: "ruta", nombre: "Ruta", color: "#1479c4", orden: 4 },
  { codigo: "distribuidor", nombre: "Distribuidor", color: "#0891b2", orden: 5 },
  { codigo: "supermercado", nombre: "Supermercado", color: "#ca8a04", orden: 6 },
  { codigo: "directa_fabrica", nombre: "Directa de fábrica", color: "#b45309", orden: 7 },
  // Compatibilidad con datos antiguos:
  { codigo: "terreno", nombre: "Vendedor / Terreno", color: "#2563eb", orden: 8 },
  { codigo: "directa", nombre: "Venta directa", color: "#a16207", orden: 9 },
];

export type Canal = { id: string; codigo: string; nombre: string; color: string; activo: boolean; orden: number };

/** Devuelve los canales (sembrando los default la primera vez). */
export async function getCanales(soloActivos = false): Promise<Canal[]> {
  let canales = await prisma.canalVenta.findMany({ orderBy: { orden: "asc" } });
  if (canales.length === 0) {
    await prisma.canalVenta.createMany({ data: CANALES_DEFAULT.map((c) => ({ ...c })) });
    canales = await prisma.canalVenta.findMany({ orderBy: { orden: "asc" } });
  }
  const lista = canales.map((c) => ({ id: c.id, codigo: c.codigo, nombre: c.nombre, color: c.color, activo: c.activo, orden: c.orden }));
  return soloActivos ? lista.filter((c) => c.activo) : lista;
}

/** Mapas rápidos de etiqueta y color por código (para pintar en cualquier vista). */
export async function getCanalMaps() {
  const canales = await getCanales();
  const label: Record<string, string> = {};
  const color: Record<string, string> = {};
  for (const c of canales) { label[c.codigo] = c.nombre; color[c.codigo] = c.color; }
  return { canales, label, color };
}

/** Deduce el canal por defecto según el tipo de cliente (editable después). */
export function canalPorTipoCliente(tipoCliente?: string | null): string | null {
  switch (tipoCliente) {
    case "distribuidor": return "distribuidor";
    case "mayorista": return "distribuidor";
    case "revendedor": return "ruta";
    case "ruta": return "ruta";
    default: return null;
  }
}
