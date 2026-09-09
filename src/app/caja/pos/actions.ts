"use server";

// Acciones de la Caja POS (versión ligera para dispositivos TUU/SUNMI con Chrome viejo).
// NO reimplementa la lógica de negocio: reutiliza las MISMAS acciones de la caja normal
// (mismo backend, base de datos, stock, precios y registro de ventas). Sólo agrega la
// revalidación de la ruta /caja/pos y mantiene al cajero dentro del POS al cerrar.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { abrirCaja, venderCaja, sesionAbierta } from "../actions";
import { abrirCajaVecina, registrarMovCajaVecina } from "../vecina/actions";

/** Abre la caja (reutiliza la acción original) y refresca el POS. */
export async function abrirCajaPOS(formData: FormData) {
  await abrirCaja(formData);
  revalidatePath("/caja/pos");
  redirect("/caja/pos");
}

/** Registra una venta de mostrador (reutiliza la acción original) y refresca el POS. */
export async function venderCajaPOS(formData: FormData) {
  await venderCaja(formData);
  revalidatePath("/caja/pos");
  redirect("/caja/pos");
}

/**
 * Cierra la caja guardando el efectivo contado. Es equivalente a la acción original
 * `cerrarCaja` pero vuelve al POS (/caja/pos) en lugar de a /caja, para no sacar al
 * cajero del dispositivo POS.
 */
export async function cerrarCajaPOS(formData: FormData) {
  const sesion = await sesionAbierta();
  if (!sesion) redirect("/caja/pos");

  const contado = Number(String(formData.get("efectivoContado") ?? "").trim().replace(",", "."));
  if (!Number.isFinite(contado) || contado < 0) {
    revalidatePath("/caja/pos");
    return;
  }

  await prisma.sesionCaja.update({
    where: { id: sesion.id },
    data: {
      estado: "cerrada",
      efectivoContado: contado,
      fechaCierre: new Date(),
      notas: String(formData.get("notas") ?? "").trim() || null,
    },
  });

  revalidatePath("/caja/pos");
  revalidatePath("/caja");
  redirect("/caja/pos");
}

/* ============================ AGREGAR PRODUCTO (POS) ============================ */
/**
 * Alta de producto desde el POS de la TUU. Misma lógica que `agregarProductoCaja`
 * (crea producto + precio en lista Sala + stock inicial en Sala con su movimiento),
 * pero sin voz/cámara y volviendo a /caja/pos/nuevo con aviso de éxito.
 */
export async function agregarProductoPOS(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const linea = String(formData.get("linea") ?? "").trim();
  if (!nombre || !linea) {
    redirect("/caja/pos/nuevo?err=1");
  }

  const tipo = String(formData.get("tipo") ?? "") === "propio" ? "propio" : "reventa";
  const formato = String(formData.get("formato") ?? "").trim() || null;
  const fotoUrl = String(formData.get("fotoUrl") ?? "").trim() || null;
  const precio = Math.max(0, Math.floor(Number(String(formData.get("precio") ?? "0").replace(/\D/g, "")) || 0));
  const stockIni = Math.max(0, Math.floor(Number(String(formData.get("stock") ?? "0").replace(/\D/g, "")) || 0));
  const stockMinimo = Math.max(0, Math.floor(Number(String(formData.get("stockMinimo") ?? "0").replace(/\D/g, "")) || 0));

  const prod = await prisma.producto.create({
    data: {
      nombre, linea, formato, tipo,
      seccion: tipo === "reventa" ? "distribucion" : "propio",
      soloLocal: tipo === "reventa",
      fotoUrl, activo: true, stockMinimo,
    },
  });

  const salaLista =
    (await prisma.listaPrecio.findFirst({ where: { canal: "sala" } })) ??
    (await prisma.listaPrecio.findFirst({ where: { activo: true } }));
  if (salaLista && precio > 0) {
    await prisma.precioProducto.create({ data: { productoId: prod.id, listaId: salaLista.id, cantidadMinima: 1, precio } });
  }

  const salaUbic =
    (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } })) ??
    (await prisma.ubicacion.findFirst());
  if (salaUbic && stockIni > 0) {
    await prisma.stock.create({ data: { productoId: prod.id, ubicacionId: salaUbic.id, cantidad: stockIni } });
    await prisma.movimientoStock.create({ data: { productoId: prod.id, tipo: "ingreso", ubicacionDestinoId: salaUbic.id, cantidad: stockIni } });
  }

  revalidatePath("/caja/pos");
  revalidatePath("/caja/pos/nuevo");
  revalidatePath("/caja");
  revalidatePath("/admin/productos");
  redirect("/caja/pos/nuevo?ok=" + encodeURIComponent(nombre));
}

/* ============================ CAJA VECINA (POS) ============================ */
/** Abre la Caja Vecina (reutiliza la acción original) y vuelve al POS. */
export async function abrirVecinaPOS(formData: FormData) {
  await abrirCajaVecina(formData);
  revalidatePath("/caja/pos/vecina");
  redirect("/caja/pos/vecina");
}

/** Registra un movimiento de Caja Vecina (reutiliza la acción original) y vuelve al POS. */
export async function movVecinaPOS(formData: FormData) {
  await registrarMovCajaVecina(formData);
  revalidatePath("/caja/pos/vecina");
  redirect("/caja/pos/vecina");
}

/**
 * Cierra la Caja Vecina del día (equivalente a `cerrarCajaVecina` pero vuelve al POS):
 * deja el registro de cierre con efectivo contado y saldo final de la máquina.
 */
export async function cerrarVecinaPOS(formData: FormData) {
  const numero = (s: string) => Number(String(s).replace(/[^\d]/g, ""));
  const efectivoContado = numero(String(formData.get("efectivoContado") ?? ""));
  const saldoMaquinaFinal = numero(String(formData.get("saldoMaquinaFinal") ?? ""));
  const notas = String(formData.get("notas") ?? "").trim();
  const u = await usuarioActual();

  const detalle =
    `Efectivo contado: ${efectivoContado} · Saldo máquina final: ${saldoMaquinaFinal}` +
    (notas ? ` · ${notas}` : "");

  await prisma.movimientoCajaVecina.create({
    data: {
      tipo: "cierre",
      monto: 0,
      saldoMaquina: Number.isFinite(saldoMaquinaFinal) ? saldoMaquinaFinal : null,
      detalle,
      usuarioId: u?.sub ?? null,
      nombreUsuario: u?.nombre ?? null,
    },
  });

  revalidatePath("/caja/pos/vecina");
  revalidatePath("/caja/vecina");
  revalidatePath("/admin/caja-vecina");
  redirect("/caja/pos/vecina");
}
