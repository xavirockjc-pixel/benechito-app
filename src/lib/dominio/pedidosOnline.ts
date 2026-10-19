// Dominio: organización de los pedidos online (tienda) en "canastos" para operarlos.
// Separa lo que es RETIRO en local, DELIVERY con moto (particulares de la zona),
// COMERCIOS (negocios → ruta) y OTRA ZONA (particulares fuera de la zona → se agenda
// con la ruta). La idea es que el local sepa de un vistazo qué hacer con cada pedido.

/** Tipos de cliente que son NEGOCIO (no particular). El resto se trata como particular. */
export const TIPOS_NEGOCIO = new Set([
  "ruta", "distribuidor", "revendedor", "mayorista",
  "negocio_retiro", "negocio", "punto_benechito", "supermercado",
]);

/** ¿El cliente es un particular (consumidor final) y no un negocio? */
export function esParticular(tipoCliente?: string | null): boolean {
  return !TIPOS_NEGOCIO.has((tipoCliente ?? "").trim());
}

export type BucketOnline = "delivery_moto" | "retiro" | "comercio_ruta" | "otra_zona";

/**
 * Clasifica un pedido en su canasto:
 *  - retiro           → el cliente retira en el local.
 *  - delivery_moto    → particular de la zona (Coronel/Lota): la moto lo deja a domicilio.
 *  - comercio_ruta    → negocio: se deriva a la ruta del vendedor.
 *  - otra_zona        → particular fuera de la zona: se agenda aprovechando la ruta.
 */
export function bucketPedido(tipoEntrega?: string | null, tipoCliente?: string | null): BucketOnline {
  const te = (tipoEntrega ?? "").trim();
  if (te === "retiro") return "retiro";
  if (!esParticular(tipoCliente)) return "comercio_ruta";
  if (te === "delivery") return "delivery_moto";
  return "otra_zona"; // despacho/reparto de particular fuera de zona
}

/** Metadatos de cada canasto para la UI (orden, ícono, título, nota y color). */
export const BUCKETS_ONLINE: { id: BucketOnline; icono: string; titulo: string; nota: string; color: string; bg: string }[] = [
  { id: "delivery_moto", icono: "🛵", titulo: "Delivery (moto)", nota: "Particulares de la zona (Coronel/Lota). La moto los retira en el local.", color: "#0f766e", bg: "#ccfbf1" },
  { id: "retiro", icono: "🏪", titulo: "Retiro en local", nota: "El cliente pasa a buscarlo. Déjalo listo para el día de retiro.", color: "#1479c4", bg: "#dbeafe" },
  { id: "comercio_ruta", icono: "🗺️", titulo: "Comercios → Ruta", nota: "Pedidos de negocios: se derivan a la ruta del vendedor.", color: "#b45309", bg: "#fef3c7" },
  { id: "otra_zona", icono: "📋", titulo: "Otra zona → Agendar con ruta", nota: "Particular fuera de la zona: sin delivery, se agenda aprovechando la ruta.", color: "#6b3f1d", bg: "#f5e6d8" },
];
