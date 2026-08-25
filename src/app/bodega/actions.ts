"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { borrarCookieSesion, usuarioActual } from "@/lib/auth";

/** Cierra la sesión. */
export async function logout() {
  await borrarCookieSesion();
  redirect("/login");
}

/** Ubicación de una zona operativa: "bodega" o "sala" (local). */
async function ubicacionDeZona(zona: string): Promise<string | null> {
  const tipo = zona === "sala" ? "sala" : "bodega";
  const u = (await prisma.ubicacion.findFirst({ where: { tipo } })) ?? (await prisma.ubicacion.findFirst({ where: { tipo: "bodega" } }));
  return u?.id ?? null;
}

type ItemMov = { id: string; delta: number; nombre?: string }; // id = "prod:<id>" | "sab:<id>"

/**
 * Aplica movimientos de stock en una zona (bodega o local/sala). delta>0 = entra
 * (producción/recepción), delta<0 = sale (merma/ajuste). Productos (Stock) y
 * sabores (StockSabor). Nunca deja el stock por debajo de 0. Deja registro diario.
 */
export async function moverStockBodega(formData: FormData) {
  const zona = String(formData.get("zona") ?? "bodega").trim() === "sala" ? "sala" : "bodega";
  let items: ItemMov[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return;
  }
  items = items.filter((i) => typeof i.id === "string" && Number.isFinite(i.delta) && i.delta !== 0);
  if (items.length === 0) return;

  const ubic = await ubicacionDeZona(zona);
  if (!ubic) return;

  const u = await usuarioActual();

  const registrar = (clase: "producto" | "sabor", refId: string, nombre: string, aplicado: number) =>
    prisma.movimientoBodega.create({
      data: {
        zona,
        ubicacionId: ubic,
        tipo: aplicado > 0 ? "entrada" : "merma",
        clase,
        refId,
        nombre,
        cantidad: Math.abs(aplicado),
        usuarioId: u?.sub ?? null,
        nombreUsuario: u?.nombre ?? null,
      },
    });

  for (const it of items) {
    const [kind, realId] = it.id.split(":");
    if (!realId) continue;
    const nombre = it.nombre?.trim() || realId;

    if (kind === "prod") {
      const actual = await prisma.stock.findUnique({ where: { productoId_ubicacionId: { productoId: realId, ubicacionId: ubic } } });
      const disponible = actual?.cantidad ?? 0;
      const nueva = Math.max(0, disponible + it.delta);
      const aplicado = nueva - disponible;
      if (aplicado === 0) continue;
      await prisma.stock.upsert({
        where: { productoId_ubicacionId: { productoId: realId, ubicacionId: ubic } },
        update: { cantidad: nueva },
        create: { productoId: realId, ubicacionId: ubic, cantidad: nueva },
      });
      await prisma.movimientoStock.create({
        data: {
          productoId: realId,
          tipo: aplicado > 0 ? (zona === "sala" ? "ingreso" : "produccion") : "merma",
          ubicacionDestinoId: aplicado > 0 ? ubic : null,
          ubicacionOrigenId: aplicado < 0 ? ubic : null,
          cantidad: Math.abs(aplicado),
          referencia: zona === "sala" ? "local-app" : "bodega-app",
        },
      });
      await registrar("producto", realId, nombre, aplicado);
    } else if (kind === "sab") {
      const actual = await prisma.stockSabor.findUnique({ where: { saborId_ubicacionId: { saborId: realId, ubicacionId: ubic } } });
      const disponible = actual?.cantidad ?? 0;
      const nueva = Math.max(0, disponible + it.delta);
      const aplicado = nueva - disponible;
      if (aplicado === 0) continue;
      await prisma.stockSabor.upsert({
        where: { saborId_ubicacionId: { saborId: realId, ubicacionId: ubic } },
        update: { cantidad: nueva },
        create: { saborId: realId, ubicacionId: ubic, cantidad: nueva },
      });
      await registrar("sabor", realId, nombre, aplicado);
    }
  }

  revalidatePath(zona === "sala" ? "/caja/distribucion" : "/bodega");
  redirect(zona === "sala" ? "/caja/distribucion?ok=1" : "/bodega?ok=1");
}

const BOLSA = 50; // una bolsa = 50 unidades de un sabor

/**
 * Arma mixtos/surtidos: el bodeguero saca BOLSAS (×50) de sabores de cámara, las
 * mezcla y produce N mixtos (un producto). Descuenta los sabores usados y suma los
 * mixtos. El registro diario del bodeguero muestra SOLO cuántos mixtos hizo; el
 * detalle de sabores se guarda para el panel (privacidad).
 */
export async function armarMixto(formData: FormData) {
  const productoMixtoId = String(formData.get("productoMixtoId") ?? "").trim();
  const nombreMixto = String(formData.get("nombreMixto") ?? "").trim() || "Mixto";
  const cantidadMixtos = Number(String(formData.get("cantidadMixtos") ?? "").trim());
  if (!productoMixtoId || !Number.isFinite(cantidadMixtos) || cantidadMixtos <= 0) return;

  let consumos: { saborId: string; nombre?: string; bolsas: number }[] = [];
  try {
    consumos = JSON.parse(String(formData.get("consumos") ?? "[]"));
  } catch {
    return;
  }
  consumos = consumos.filter((c) => c.saborId && Number.isFinite(c.bolsas) && c.bolsas > 0);
  if (consumos.length === 0) return;

  const bod = await ubicacionDeZona("bodega");
  if (!bod) return;
  const u = await usuarioActual();

  // Descuenta las bolsas de sabores (en unidades) de la cámara (bodega).
  const partes: string[] = [];
  for (const c of consumos) {
    const unidades = c.bolsas * BOLSA;
    const actual = await prisma.stockSabor.findUnique({ where: { saborId_ubicacionId: { saborId: c.saborId, ubicacionId: bod } } });
    const disponible = actual?.cantidad ?? 0;
    const nueva = Math.max(0, disponible - unidades);
    await prisma.stockSabor.upsert({
      where: { saborId_ubicacionId: { saborId: c.saborId, ubicacionId: bod } },
      update: { cantidad: nueva },
      create: { saborId: c.saborId, ubicacionId: bod, cantidad: nueva },
    });
    partes.push(`${c.bolsas} bolsa${c.bolsas > 1 ? "s" : ""} ${c.nombre ?? ""}`.trim());
  }

  // Suma los mixtos producidos al stock del producto (bodega).
  await prisma.stock.upsert({
    where: { productoId_ubicacionId: { productoId: productoMixtoId, ubicacionId: bod } },
    update: { cantidad: { increment: cantidadMixtos } },
    create: { productoId: productoMixtoId, ubicacionId: bod, cantidad: cantidadMixtos },
  });
  await prisma.movimientoStock.create({
    data: { productoId: productoMixtoId, tipo: "produccion", ubicacionDestinoId: bod, cantidad: cantidadMixtos, referencia: "mixto" },
  });

  // Registro del día: SOLO cuántos mixtos (el detalle de sabores queda para el panel).
  await prisma.movimientoBodega.create({
    data: {
      zona: "bodega",
      ubicacionId: bod,
      tipo: "mixto",
      clase: "producto",
      refId: productoMixtoId,
      nombre: nombreMixto,
      detalle: partes.join(", "),
      cantidad: cantidadMixtos,
      usuarioId: u?.sub ?? null,
      nombreUsuario: u?.nombre ?? null,
    },
  });

  revalidatePath("/bodega");
  redirect("/bodega?ok=1");
}

/**
 * Crea un producto de distribución (reventa) desde el local, indicando tipo y sabor,
 * y opcionalmente recibe una cantidad inicial en la sala. Nombre = "Tipo Sabor Formato".
 */
export async function crearProductoDistribucion(formData: FormData) {
  const tipo = String(formData.get("tipoProducto") ?? "").trim(); // ej: Bebida, Snack
  const sabor = String(formData.get("saborProducto") ?? "").trim(); // ej: Coca, Naranja
  const formato = String(formData.get("formato") ?? "").trim(); // ej: 350ml
  const cantidad = Number(String(formData.get("cantidad") ?? "0").trim());
  if (!tipo && !sabor) return;

  const nombre = [tipo, sabor, formato].filter(Boolean).join(" ").trim();
  if (!nombre) return;

  // Evita duplicados por nombre.
  let producto = await prisma.producto.findFirst({ where: { nombre } });
  if (!producto) {
    producto = await prisma.producto.create({
      data: {
        nombre,
        linea: "reventa",
        categoria: tipo || "Distribución",
        formato: formato || null,
        tipo: "reventa",
        soloLocal: true,
        activo: true,
      },
    });
  }

  if (Number.isFinite(cantidad) && cantidad > 0) {
    const sala = await ubicacionDeZona("sala");
    if (sala) {
      const u = await usuarioActual();
      await prisma.stock.upsert({
        where: { productoId_ubicacionId: { productoId: producto.id, ubicacionId: sala } },
        update: { cantidad: { increment: cantidad } },
        create: { productoId: producto.id, ubicacionId: sala, cantidad },
      });
      await prisma.movimientoStock.create({
        data: { productoId: producto.id, tipo: "ingreso", ubicacionDestinoId: sala, cantidad, referencia: "local-app" },
      });
      await prisma.movimientoBodega.create({
        data: {
          zona: "sala", ubicacionId: sala, tipo: "entrada", clase: "producto",
          refId: producto.id, nombre, cantidad,
          usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
        },
      });
    }
  }

  revalidatePath("/caja/distribucion");
  redirect("/caja/distribucion?ok=1");
}
