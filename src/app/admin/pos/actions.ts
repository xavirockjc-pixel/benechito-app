"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { crearDocumentoVenta } from "@/lib/facturacion";
import { MEDIOS_PAGO, estadoPagoDe } from "@/lib/dominio/ventas";
import { CANALES_VENTA, type CanalVenta } from "@/lib/dominio/venta-voz";

type LineaPOS = { productoId: string; cantidad: number; precioUnit: number };
type LineaVoz = { nombre?: string; productoId?: string; cantidad: number; precioUnit: number };

/** Cliente genérico de mostrador (walk-in). Se crea una vez y se reutiliza. */
async function clienteMostrador() {
  let c = await prisma.negocio.findFirst({ where: { nombreNegocio: "Consumidor Final" } });
  if (!c) {
    c = await prisma.negocio.create({
      data: {
        nombreContacto: "Consumidor Final",
        nombreNegocio: "Consumidor Final",
        whatsapp: "",
        comuna: "",
        tipoCliente: "consumidor",
        estado: "punto_activo",
        origen: "pos",
      },
    });
  }
  return c;
}

/** Busca un producto por nombre (match simple) o lo crea al vuelo. */
async function buscarOCrearProducto(nombreRaw: string) {
  const nombre = nombreRaw.trim();
  if (!nombre) return null;
  const norm = nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const activos = await prisma.producto.findMany({ where: { activo: true }, select: { id: true, nombre: true } });
  // Match por cobertura de palabras (≥3 letras).
  let mejor: { id: string } | null = null, mejorScore = 0;
  for (const p of activos) {
    const toks = p.nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).filter((w) => w.length >= 3);
    if (!toks.length) continue;
    const aciertos = toks.filter((w) => norm.includes(w)).length;
    const score = aciertos / toks.length;
    if (aciertos > 0 && score > mejorScore) { mejorScore = score; mejor = { id: p.id }; }
  }
  if (mejor) return mejor.id;
  // No existe → lo crea (se asume que se está agregando al catálogo).
  const creado = await prisma.producto.create({
    data: { nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1), linea: "otros", tipo: "propio", seccion: "propio", activo: true },
  });
  return creado.id;
}

/**
 * Venta por VOZ: recibe canal (local/ruta/distribuidor) y líneas dictadas.
 * Busca o crea cada producto, aplica el precio del canal (o el editado), descuenta
 * stock (aunque quede negativo: se asume reposición) y registra la venta en finanzas.
 */
export async function venderVoz(formData: FormData) {
  const canalKey = String(formData.get("canal") ?? "local").trim() as CanalVenta;
  const canal = CANALES_VENTA[canalKey] ?? CANALES_VENTA.local;
  const modo = String(formData.get("modo") ?? "efectivo").trim(); // efectivo|transferencia|fiado
  const negocioIdSel = String(formData.get("negocioId") ?? "").trim();

  let lineas: LineaVoz[] = [];
  try { lineas = JSON.parse(String(formData.get("items") ?? "[]")); } catch { return; }
  lineas = lineas.filter((l) => (l.productoId || l.nombre) && l.cantidad > 0);
  if (lineas.length === 0) return;

  const ubicacion =
    (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } })) ?? (await prisma.ubicacion.findFirst());
  if (!ubicacion) return;

  const lista = (await prisma.listaPrecio.findFirst({ where: { canal: canal.lista, activo: true } }))
    ?? (await prisma.listaPrecio.findFirst({ where: { activo: true } }));

  // Resuelve producto + precio de cada línea.
  const items: LineaPOS[] = [];
  for (const l of lineas) {
    const productoId = l.productoId || (await buscarOCrearProducto(l.nombre ?? ""));
    if (!productoId) continue;
    let precioUnit = Number(l.precioUnit) || 0;
    // Si no vino precio, intenta tomar el del canal.
    if (precioUnit <= 0 && lista) {
      const pp = await prisma.precioProducto.findFirst({ where: { productoId, listaId: lista.id, cantidadMinima: 1 } });
      if (pp) precioUnit = Number(pp.precio);
    }
    // Si se dictó un precio y el producto aún no lo tenía en el canal, lo aprende.
    if (precioUnit > 0 && lista) {
      const existe = await prisma.precioProducto.findFirst({ where: { productoId, listaId: lista.id, cantidadMinima: 1 } });
      if (!existe) await prisma.precioProducto.create({ data: { productoId, listaId: lista.id, cantidadMinima: 1, precio: precioUnit } });
    }
    items.push({ productoId, cantidad: Number(l.cantidad), precioUnit });
  }
  if (items.length === 0) return;

  const total = items.reduce((s, i) => s + i.precioUnit * i.cantidad, 0);

  const cliente = negocioIdSel
    ? (await prisma.negocio.findUnique({ where: { id: negocioIdSel } })) ?? (await clienteMostrador())
    : await clienteMostrador();
  const clienteReal = cliente.nombreNegocio !== "Consumidor Final";

  const fiado = modo === "fiado" && clienteReal;
  const medio = ["efectivo", "transferencia"].includes(modo) ? modo : "efectivo";

  const venta = await prisma.venta.create({
    data: {
      negocioId: cliente.id,
      ubicacionId: ubicacion.id,
      total,
      estadoPago: fiado ? "pendiente" : "pagado",
      documento: "boleta",
      canal: canal.ventaCanal,
      ...(fiado ? {} : { pagos: { create: { medio, monto: total } } }),
    },
  });

  for (const it of items) {
    await prisma.stock.upsert({
      where: { productoId_ubicacionId: { productoId: it.productoId, ubicacionId: ubicacion.id } },
      update: { cantidad: { decrement: it.cantidad } },
      create: { productoId: it.productoId, ubicacionId: ubicacion.id, cantidad: -it.cantidad },
    });
    await prisma.movimientoStock.create({
      data: { productoId: it.productoId, tipo: "venta", ubicacionOrigenId: ubicacion.id, cantidad: it.cantidad, referencia: venta.id },
    });
  }

  await crearDocumentoVenta({ ventaId: venta.id, negocioId: cliente.id, tipo: "boleta", total });

  revalidatePath("/admin/ventas");
  revalidatePath("/admin/inventario");
  redirect(`/admin/ventas/${venta.id}`);
}

/**
 * Venta de mostrador (POS): crea la venta pagada, registra el pago y descuenta stock
 * de la sala de ventas. Recibe las líneas como JSON en el campo `items`.
 */
export async function venderPOS(formData: FormData) {
  const modo = String(formData.get("modo") ?? formData.get("medio") ?? "efectivo").trim(); // efectivo|transferencia|credito|abono
  const negocioIdSel = String(formData.get("negocioId") ?? "").trim();
  const raw = String(formData.get("items") ?? "[]");

  let items: LineaPOS[] = [];
  try {
    items = JSON.parse(raw);
  } catch {
    return;
  }
  items = items.filter((i) => i.productoId && i.cantidad > 0 && i.precioUnit >= 0);
  if (items.length === 0) return;

  const total = items.reduce((s, i) => s + i.precioUnit * i.cantidad, 0);

  const ubicacion =
    (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } })) ??
    (await prisma.ubicacion.findFirst());
  if (!ubicacion) return;

  // Cliente: el elegido, o "Consumidor Final" (mostrador). Crédito/abono requieren
  // un cliente real; con mostrador se fuerza pago al contado.
  const cliente = negocioIdSel
    ? (await prisma.negocio.findUnique({ where: { id: negocioIdSel } })) ?? (await clienteMostrador())
    : await clienteMostrador();
  const clienteReal = Boolean(negocioIdSel) && cliente.nombreNegocio !== "Consumidor Final";

  // Abono: paga una parte ahora, el resto queda de deuda.
  let abono = Number(String(formData.get("abono") ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(abono) || abono < 0) abono = 0;
  abono = Math.min(abono, total);
  const medioAbonoRaw = String(formData.get("medioAbono") ?? "efectivo");
  const medioAbono = (MEDIOS_PAGO as readonly string[]).includes(medioAbonoRaw) && medioAbonoRaw !== "credito" ? medioAbonoRaw : "efectivo";

  const esAbono = modo === "abono" && clienteReal;
  const aCredito = modo === "credito" && clienteReal;
  const medio = (MEDIOS_PAGO as readonly string[]).includes(modo) ? modo : "efectivo";

  let estadoPago: string;
  let pagos: { create: { medio: string; monto: number } } | undefined;
  if (esAbono) {
    estadoPago = estadoPagoDe(total, abono);
    pagos = abono > 0 ? { create: { medio: medioAbono, monto: abono } } : undefined;
  } else if (aCredito) {
    estadoPago = "pendiente";
    pagos = undefined;
  } else {
    estadoPago = "pagado";
    pagos = { create: { medio, monto: total } };
  }

  const venta = await prisma.venta.create({
    data: {
      negocioId: cliente.id,
      ubicacionId: ubicacion.id,
      total,
      estadoPago,
      documento: "boleta",
      canal: "directa",
      ...(pagos ? { pagos } : {}),
    },
  });

  // Descuenta stock de la sala y registra el movimiento por cada línea.
  for (const it of items) {
    await prisma.stock.upsert({
      where: { productoId_ubicacionId: { productoId: it.productoId, ubicacionId: ubicacion.id } },
      update: { cantidad: { decrement: it.cantidad } },
      create: { productoId: it.productoId, ubicacionId: ubicacion.id, cantidad: -it.cantidad },
    });
    await prisma.movimientoStock.create({
      data: {
        productoId: it.productoId,
        tipo: "venta",
        ubicacionOrigenId: ubicacion.id,
        cantidad: it.cantidad,
        referencia: venta.id,
      },
    });
  }

  await crearDocumentoVenta({ ventaId: venta.id, negocioId: cliente.id, tipo: "boleta", total });

  revalidatePath("/admin/ventas");
  revalidatePath("/admin/inventario");
  redirect(`/admin/ventas/${venta.id}`);
}
