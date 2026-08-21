// Dominio: resolución de precios. Fuente única de verdad para "qué precio corresponde".
// Regla del ecosistema: un producto ÚNICO, muchos precios en listas. El sistema
// determina automáticamente la lista según el cliente y el canal (nunca se inventa).

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/** Canal por defecto según el tipo de cliente (cuando el cliente no tiene lista asignada). */
export const canalPorTipoCliente: Record<string, string> = {
  consumidor: "sala",
  negocio: "negocio",
  punto_benechito: "punto",
  revendedor: "revendedor",
  distribuidor: "distribuidor",
  supermercado: "supermercado",
  prospecto: "sala",
};

/** Tipos de cliente (orden para UI). */
export const TIPOS_CLIENTE = [
  "consumidor",
  "negocio",
  "punto_benechito",
  "revendedor",
  "distribuidor",
  "supermercado",
  "prospecto",
] as const;

/** Etiquetas legibles de tipos de cliente (para UI). */
export const tipoClienteLabel: Record<string, string> = {
  consumidor: "Consumidor final",
  negocio: "Negocio",
  punto_benechito: "Punto Benechito",
  revendedor: "Revendedor",
  distribuidor: "Distribuidor",
  supermercado: "Supermercado",
  prospecto: "Prospecto",
};

/** Etiquetas legibles de canales (para UI). */
export const canalLabel: Record<string, string> = {
  sala: "Sala de Ventas",
  web: "Web",
  reparto: "Reparto",
  negocio: "Negocio",
  punto: "Punto Benechito",
  revendedor: "Revendedor",
  distribuidor: "Distribuidor",
  supermercado: "Supermercado",
};

/**
 * Determina la lista de precios que corresponde a un cliente (Negocio).
 * Prioridad: lista asignada explícitamente → lista por canal del tipo de cliente.
 * Devuelve el id de la lista, o null si no hay ninguna configurada.
 */
export async function listaParaCliente(negocioId: string): Promise<string | null> {
  const cliente = await prisma.negocio.findUnique({
    where: { id: negocioId },
    select: { listaPrecioId: true, tipoCliente: true },
  });
  if (!cliente) return null;
  if (cliente.listaPrecioId) return cliente.listaPrecioId;

  const canal = canalPorTipoCliente[cliente.tipoCliente] ?? "sala";
  const lista = await prisma.listaPrecio.findFirst({
    where: { canal, activo: true },
    select: { id: true },
  });
  return lista?.id ?? null;
}

/**
 * Resuelve el precio unitario de un producto en una lista, considerando tramos por
 * cantidad (cantidadMinima). Elige el mejor tramo aplicable a la cantidad dada.
 * Devuelve el precio ya con descuento aplicado, o null si el producto no tiene precio en la lista.
 */
export async function resolverPrecio(
  productoId: string,
  listaId: string,
  cantidad = 1,
): Promise<Prisma.Decimal | null> {
  const tramos = await prisma.precioProducto.findMany({
    where: { productoId, listaId, cantidadMinima: { lte: cantidad } },
    orderBy: { cantidadMinima: "desc" },
    take: 1,
  });
  const tramo = tramos[0];
  if (!tramo) return null;
  if (tramo.descuento) return tramo.precio.minus(tramo.descuento);
  return tramo.precio;
}

/**
 * Precio unitario para un cliente concreto (combina listaParaCliente + resolverPrecio).
 * Es el punto de entrada que usarán POS, pedidos, chatbot y agentes IA.
 */
export async function precioParaCliente(
  negocioId: string,
  productoId: string,
  cantidad = 1,
): Promise<Prisma.Decimal | null> {
  const listaId = await listaParaCliente(negocioId);
  if (!listaId) return null;
  return resolverPrecio(productoId, listaId, cantidad);
}
