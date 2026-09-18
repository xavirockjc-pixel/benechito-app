"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { borrarCookieSesion, usuarioActual } from "@/lib/auth";
import { marcarAsistenciaAuto } from "@/lib/asistencia";
import { rendimientoAprendido, resumenTurnoProduccion } from "@/lib/dominio/fabricacion";
import { inicioDelDia } from "@/lib/dominio/empresa";
import { normalizaTexto, detectaTipoNota, detectaPrioridadNota, detectaAccionNota, detectaCantidad } from "@/lib/dominio/notas";

/** Desbloquea UN tipo si su clave coincide (cookie con la lista de tipos abiertos, 8h). */
export async function desbloquearRecetas(formData: FormData) {
  const clave = String(formData.get("clave") ?? "").trim();
  const linea = String(formData.get("linea") ?? "").trim();
  if (!linea) redirect("/produccion");
  const cr = await prisma.claveReceta.findUnique({ where: { linea } });
  if (cr && clave && clave === cr.clave) {
    const c = await cookies();
    const actual = (c.get("recetas_ok")?.value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!actual.includes(linea)) actual.push(linea);
    c.set("recetas_ok", actual.join(","), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
    redirect("/produccion?desbloqueo=1");
  }
  redirect("/produccion?desbloqueo=0");
}

/** Vuelve a bloquear todas las recetas protegidas (borra el permiso). */
export async function bloquearRecetas() {
  const c = await cookies();
  c.delete("recetas_ok");
  redirect("/produccion");
}

/** Cierra la sesión. */
export async function logout() {
  await borrarCookieSesion();
  redirect("/login");
}

async function bodegaId(): Promise<string | null> {
  const b = await prisma.ubicacion.findFirst({ where: { tipo: "bodega" } });
  return b?.id ?? null;
}

/**
 * Control de calidad: confirma la mezcla tiqueando los insumos de la receta que se
 * echaron. Descuenta de la base de insumos SOLO los tiqueados (cantidad de la receta
 * × unidades a producir) y deja el consumo registrado. Evita descontar dos veces
 * porque el descuento va únicamente por aquí (no automático al registrar producción).
 */
export async function confirmarMezcla(formData: FormData) {
  const unidades = Number(String(formData.get("cantidad") ?? "0").trim()) || 0; // unidades que salieron (opcional)
  const base = Number(String(formData.get("base") ?? "").trim().replace(",", ".")); // litros/kg de base
  const baseUnidad = String(formData.get("baseUnidad") ?? "l").trim() === "kg" ? "kg" : "l";
  const linea = String(formData.get("linea") ?? "").trim() || null;
  const total = Number(String(formData.get("total") ?? "0").trim()) || 0;
  const turno = String(formData.get("turno") ?? "").trim() || null;
  const operarios = String(formData.get("operarios") ?? "").trim() || null;
  const observaciones = String(formData.get("observaciones") ?? "").trim() || null;
  const marcados = (formData.getAll("marcado") as string[]).map((s) => String(s)).filter(Boolean);

  // Sabores del lote: [{ nombre, porcion, agregados:[{rol?, materiaPrimaId?, nombre?, unidad?, cantidad}] }]
  type Ag = { rol?: string; materiaPrimaId?: string; nombre?: string; unidad?: string; cantidad: number };
  type SaborLote = { nombre: string; porcion?: number; agregados: Ag[] };
  let sabores: SaborLote[] = [];
  try { sabores = JSON.parse(String(formData.get("sabores") ?? "[]")); } catch { sabores = []; }
  sabores = (sabores ?? []).filter((s) => s && s.nombre);
  const totalAgregados = sabores.reduce((a, s) => a + (s.agregados?.length ?? 0), 0);

  const baseOk = Number.isFinite(base) && base > 0;
  if (marcados.length === 0 && totalAgregados === 0) return;
  if (marcados.length > 0 && !baseOk) return;

  const u = await usuarioActual();
  const nombreSabores = sabores.map((s) => s.nombre).join(", ");
  const nombre = (nombreSabores ? `${nombreSabores} · ` : "") + (linea ?? "Mezcla");

  // Lote de fabricación: fecha + turno + correlativo del día.
  const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
  const seq = (await prisma.controlCalidad.count({ where: { fecha: { gte: hoy0 } } })) + 1;
  const yy = hoy0.getFullYear(); const mm = String(hoy0.getMonth() + 1).padStart(2, "0"); const dd = String(hoy0.getDate()).padStart(2, "0");
  const turnoIni = turno ? turno.charAt(0).toUpperCase() : "L";
  const lote = `${yy}${mm}${dd}-${turnoIni}-${String(seq).padStart(2, "0")}`;

  // Registro de control de calidad (historial de la central).
  const control = await prisma.controlCalidad.create({
    data: {
      turno, operarios, clase: "linea", refId: linea, nombre, cantidad: unidades,
      base: baseOk ? base : null, baseUnidad: baseOk ? baseUnidad : null,
      itemsMarcados: marcados.length, itemsTotal: total, lote, observaciones,
      usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
    },
  });

  // Receta base: escala por el lote de referencia (producido / referencia).
  // Si no hay referencia, la cantidad se toma "por 1 L/kg" (baseRef = 1).
  if (marcados.length > 0 && baseOk) {
    const ref = linea ? await prisma.recetaBase.findUnique({ where: { linea } }) : null;
    const baseRef = ref && ref.baseRef > 0 ? ref.baseRef : 1;
    const items = await prisma.recetaItem.findMany({ where: { id: { in: marcados } } });
    for (const it of items) {
      const usar = it.cantidad * (base / baseRef);
      if (usar <= 0) continue;
      await prisma.materiaPrima.update({ where: { id: it.materiaPrimaId }, data: { stock: { decrement: usar } } });
      await prisma.movimientoMateria.create({
        data: {
          materiaPrimaId: it.materiaPrimaId, tipo: "consumo", cantidad: usar,
          motivo: `Base · ${nombre} · ${base} ${baseUnidad}`, referencia: control.id,
          usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
        },
      });
    }
  }

  // Sabores del lote: por cada sabor, descuenta sus agregados (esencia, color…).
  // Si el insumo no existe, se crea solo en la base. Cada uso queda con su sabor.
  const UNID = ["kg", "g", "l", "ml", "unidad"];
  for (const s of sabores) {
    for (const ag of s.agregados ?? []) {
      if (!Number.isFinite(ag.cantidad) || ag.cantidad <= 0) continue;
      let mpId = ag.materiaPrimaId ?? "";
      let nombreInsumo = "";
      let unidad = "g";
      if (mpId) {
        const mp = await prisma.materiaPrima.findUnique({ where: { id: mpId }, select: { nombre: true, unidad: true } });
        if (!mp) continue;
        nombreInsumo = mp.nombre; unidad = mp.unidad;
      } else if (ag.nombre) {
        const ex = await prisma.materiaPrima.findFirst({ where: { nombre: { equals: ag.nombre.trim(), mode: "insensitive" } } });
        if (ex) { mpId = ex.id; nombreInsumo = ex.nombre; unidad = ex.unidad; }
        else {
          const un = UNID.includes(ag.unidad ?? "") ? ag.unidad! : "g";
          const ROL_SUBTIPO: Record<string, string> = { esencia: "esencia", color: "colorante", preparado: "preparado", salsa: "salsa", topping: "topping" };
          const subtipo = ROL_SUBTIPO[ag.rol ?? ""] ?? "otro";
          const nv = await prisma.materiaPrima.create({ data: { nombre: ag.nombre.trim(), unidad: un, subtipo } });
          mpId = nv.id; nombreInsumo = nv.nombre; unidad = nv.unidad;
        }
      } else continue;

      await prisma.materiaPrima.update({ where: { id: mpId }, data: { stock: { decrement: ag.cantidad } } });
      await prisma.movimientoMateria.create({
        data: {
          materiaPrimaId: mpId, tipo: "consumo", cantidad: ag.cantidad,
          motivo: `${s.nombre} · ${linea ?? ""} (lote ${lote})`, referencia: control.id,
          usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
        },
      });
      await prisma.agregadoUso.create({
        data: {
          controlId: control.id, materiaPrimaId: mpId, nombreInsumo, unidad,
          cantidad: ag.cantidad, linea, sabor: s.nombre, formato: null,
          unidadesProducidas: Math.round(s.porcion ?? 0),
          usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
        },
      });
    }
  }

  revalidatePath("/produccion");
  revalidatePath("/admin/materias");
  revalidatePath("/admin/control-calidad");
  redirect("/produccion?mezcla=1");
}

type ItemProd = { saborId?: string; nombre: string; cantidad: number };

/**
 * Registra producción por TIPO (línea) + SABOR. Cada sabor producido entra al
 * stock de sabores de la bodega (StockSabor); si el sabor no existe, se crea.
 * Queda en el registro del día de Producción (zona "produccion").
 */
export async function registrarProduccion(formData: FormData) {
  const linea = String(formData.get("linea") ?? "").trim() || "otro";
  let items: ItemProd[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return;
  }
  items = items.filter((i) => i.nombre?.trim() && Number.isFinite(i.cantidad) && i.cantidad > 0);
  if (items.length === 0) return;

  const bod = await bodegaId();
  if (!bod) return;
  const u = await usuarioActual();

  // Quiénes trabajaron el turno (para dividir el pago por trato). Por defecto, quien registra.
  const partRaw = String(formData.get("participantes") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const participantes = (partRaw.length > 0 ? [...new Set(partRaw)] : (u?.sub ? [u.sub] : [])).join(",") || null;

  for (const it of items) {
    let saborId = it.saborId?.trim();
    if (!saborId) {
      const existe = await prisma.sabor.findFirst({ where: { nombre: it.nombre.trim(), linea } });
      saborId = existe?.id ?? (await prisma.sabor.create({ data: { nombre: it.nombre.trim(), linea } })).id;
    }
    await prisma.stockSabor.upsert({
      where: { saborId_ubicacionId: { saborId, ubicacionId: bod } },
      update: { cantidad: { increment: it.cantidad } },
      create: { saborId, ubicacionId: bod, cantidad: it.cantidad },
    });
    await prisma.movimientoBodega.create({
      data: {
        zona: "produccion", ubicacionId: bod, tipo: "entrada", clase: "sabor",
        refId: saborId, nombre: `${it.nombre.trim()} (${linea})`, cantidad: it.cantidad,
        usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null, participantes,
      },
    });
  }

  await marcarAsistenciaAuto(u?.sub, "Producción registrada"); // asistencia automática
  revalidatePath("/produccion");
  redirect("/produccion?ok=1");
}

/**
 * El fabricante CUMPLE una orden de producción: registra la cantidad real (y merma),
 * la marca terminada e ingresa lo producido a bodega (sabor→StockSabor, producto→Stock).
 * Queda también en el registro del turno.
 */
export async function cumplirOrden(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const cantidadReal = Number(String(formData.get("cantidadReal") ?? "").trim());
  const mermaRaw = Number(String(formData.get("merma") ?? "0").trim());
  const merma = Number.isFinite(mermaRaw) ? Math.max(0, mermaRaw) : 0;
  if (!id || !Number.isFinite(cantidadReal) || cantidadReal < 0) return;

  const op = await prisma.ordenProduccion.findUnique({
    where: { id },
    include: { producto: { select: { nombre: true } }, sabor: { select: { nombre: true, linea: true } } },
  });
  if (!op || op.estado === "terminada") return;

  const bod = await bodegaId();
  const u = await usuarioActual();

  await prisma.ordenProduccion.update({
    where: { id },
    data: { cantidadReal, merma, estado: "terminada", fechaTermino: new Date(), ubicacionDestinoId: bod ?? null, responsable: op.responsable ?? u?.nombre ?? null },
  });

  if (bod && cantidadReal > 0) {
    if (op.saborId) {
      await prisma.stockSabor.upsert({
        where: { saborId_ubicacionId: { saborId: op.saborId, ubicacionId: bod } },
        update: { cantidad: { increment: cantidadReal } },
        create: { saborId: op.saborId, ubicacionId: bod, cantidad: cantidadReal },
      });
    } else if (op.productoId) {
      await prisma.stock.upsert({
        where: { productoId_ubicacionId: { productoId: op.productoId, ubicacionId: bod } },
        update: { cantidad: { increment: cantidadReal } },
        create: { productoId: op.productoId, ubicacionId: bod, cantidad: cantidadReal },
      });
      await prisma.movimientoStock.create({
        data: { productoId: op.productoId, tipo: "produccion", ubicacionDestinoId: bod, cantidad: cantidadReal, referencia: op.id },
      });
    }
    const nombre = op.saborId ? `${op.sabor?.nombre ?? ""} (${op.sabor?.linea ?? ""})` : op.producto?.nombre ?? "Producto";
    await prisma.movimientoBodega.create({
      data: {
        zona: "produccion", ubicacionId: bod, tipo: "entrada", clase: op.saborId ? "sabor" : "producto",
        refId: op.saborId ?? op.productoId ?? id, nombre, cantidad: cantidadReal,
        usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
      },
    });
  }

  await marcarAsistenciaAuto(u?.sub, "Producción registrada"); // asistencia automática
  revalidatePath("/produccion");
  redirect("/produccion?ok=1");
}

/** El fabricante ENVÍA el reporte del turno: deja constancia (auditoría) de lo producido hoy. */
export async function enviarReporteTurno() {
  const u = await usuarioActual();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const movs = await prisma.movimientoBodega.findMany({ where: { fecha: { gte: hoy }, zona: "produccion" } });
  const total = movs.reduce((s, m) => s + m.cantidad, 0);
  const detalle = JSON.stringify({
    total,
    items: movs.map((m) => ({ nombre: m.nombre, cantidad: m.cantidad })),
  });

  await prisma.auditoria.create({
    data: { usuarioId: u?.sub ?? null, accion: "reporte_turno", entidad: "Produccion", detalle },
  });

  revalidatePath("/produccion");
  redirect("/produccion?reporte=1");
}


/**
 * Fabricación editable, medida por LITROS por depósito. Como en varios productos
 * (ej. Tú y yo) no se puede contar la unidad exacta, se mide el volumen de cada
 * depósito y el sistema ESTIMA las unidades con el rendimiento aprendido
 * (unidades por litro). Si igual se contó el total real, se usa y se reparte por litros.
 *  - descuenta insumos de la receta escalados por los litros totales (consumo/costo),
 *  - suma a bodega las unidades (estimadas o reales) por sabor,
 *  - registra la tanda → de ahí el rendimiento se AFINA solo.
 */
export async function crearFabricacion(formData: FormData) {
  const linea = String(formData.get("linea") ?? "").trim();
  const preparador = String(formData.get("preparador") ?? "").trim() || null;
  const observaciones = String(formData.get("observaciones") ?? "").trim() || null;
  const porLitroForm = Number(String(formData.get("porLitro") ?? "").replace(",", ".")) || 0; // estimado manual si aún no aprende
  const unidadesReales = Math.floor(Number(String(formData.get("unidadesReales") ?? "").replace(/[^0-9]/g, "")) || 0);

  type Dep = { deposito?: string; sabor: string; litros: number };
  let depositos: Dep[] = [];
  try { depositos = JSON.parse(String(formData.get("depositos") ?? "[]")); } catch { depositos = []; }
  depositos = depositos.filter((d) => d && d.sabor?.trim() && Number.isFinite(d.litros) && d.litros > 0);
  if (!linea || depositos.length === 0) return;

  const bod = await bodegaId();
  if (!bod) return;
  const u = await usuarioActual();

  const totalLitros = depositos.reduce((s, d) => s + d.litros, 0);
  const rend = await rendimientoAprendido(linea);
  const porLitro = rend.porKilo > 0 ? rend.porKilo : porLitroForm;

  const estPorDep = depositos.map((d) => ({ ...d, est: Math.max(0, Math.round(d.litros * porLitro)) }));
  const totalEst = estPorDep.reduce((s, d) => s + d.est, 0);
  const usarReal = unidadesReales > 0;

  // Unidades finales por sabor: estimadas, o el conteo real repartido por litros.
  const porSabor = new Map<string, number>();
  for (const d of estPorDep) {
    const frac = totalEst > 0 ? d.est / totalEst : d.litros / totalLitros;
    const uds = usarReal ? Math.round(unidadesReales * frac) : d.est;
    const s = d.sabor.trim();
    porSabor.set(s, (porSabor.get(s) ?? 0) + uds);
  }
  const totalUnidades = [...porSabor.values()].reduce((a, b) => a + b, 0);

  // 1) Consumir insumos de la receta base, escalados por los litros totales.
  if (totalLitros > 0) {
    const ref = await prisma.recetaBase.findUnique({ where: { linea } });
    const baseRef = ref && ref.baseRef > 0 ? ref.baseRef : 1;
    const items = await prisma.recetaItem.findMany({ where: { linea, grupo: null } });
    for (const it of items) {
      const usar = it.cantidad * (totalLitros / baseRef);
      if (usar <= 0) continue;
      await prisma.materiaPrima.update({ where: { id: it.materiaPrimaId }, data: { stock: { decrement: usar } } });
      await prisma.movimientoMateria.create({
        data: {
          materiaPrimaId: it.materiaPrimaId, tipo: "consumo", cantidad: usar,
          motivo: `Fabricación · ${linea} · ${totalLitros} L`,
          usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
        },
      });
    }
  }

  // 2) Producir a bodega (unidades estimadas o reales) por sabor.
  for (const [sabor, unidades] of porSabor) {
    if (unidades <= 0) continue;
    let saborId = (await prisma.sabor.findFirst({ where: { nombre: sabor, linea } }))?.id;
    if (!saborId) saborId = (await prisma.sabor.create({ data: { nombre: sabor, linea } })).id;
    await prisma.stockSabor.upsert({
      where: { saborId_ubicacionId: { saborId, ubicacionId: bod } },
      update: { cantidad: { increment: unidades } },
      create: { saborId, ubicacionId: bod, cantidad: unidades },
    });
    await prisma.movimientoBodega.create({
      data: {
        zona: "produccion", ubicacionId: bod, tipo: "entrada", clase: "sabor",
        refId: saborId, nombre: `${sabor} (${linea})`, cantidad: unidades,
        usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null, participantes: preparador,
      },
    });
  }

  // 3) Registrar la tanda → de aquí aprende (unidades ÷ litros).
  await prisma.controlCalidad.create({
    data: {
      clase: "linea", refId: linea,
      nombre: `${[...porSabor.keys()].join(", ")} · ${linea}`.slice(0, 180),
      cantidad: usarReal ? unidadesReales : totalUnidades,
      base: totalLitros, baseUnidad: "l",
      preparador, operarios: preparador, depositos: JSON.stringify(estPorDep),
      observaciones, usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
    },
  });

  await marcarAsistenciaAuto(u?.sub, "Fabricación registrada");
  revalidatePath("/produccion");
  redirect("/produccion?ok=1");
}

/**
 * CIERRE DE TURNO de producción. Al final del turno el operario pone las unidades
 * REALES que salieron por línea (ej. "salieron 4112 paletas"). El sistema:
 *  - reparte ese real entre las tandas del turno (por litros) y corrige el estimado,
 *  - ajusta el stock de bodega por la diferencia (por sabor, según los depósitos),
 *  - deja un registro con la comparación mezclas↔estimado↔real y los insumos
 *    consumidos (palitos, bolsas, kg…) por línea → historial para el panel.
 * Como cada tanda queda con el conteo real, el rendimiento se AFINA solo.
 */
export async function cerrarTurnoProduccion(formData: FormData) {
  const u = await usuarioActual();
  const bod = await bodegaId();
  const desde = await inicioDelDia();

  type RealLinea = { linea: string; reales: number };
  let reales: RealLinea[] = [];
  try { reales = JSON.parse(String(formData.get("reales") ?? "[]")); } catch { reales = []; }
  const realPorLinea = new Map<string, number>();
  for (const r of reales) {
    const n = Math.max(0, Math.floor(Number(r?.reales) || 0));
    if (r?.linea && n > 0) realPorLinea.set(String(r.linea).trim(), n);
  }

  // Snapshot del turno ANTES de reconciliar (litros, estimado, insumos).
  const resumen = await resumenTurnoProduccion(desde);

  const comparacion: { linea: string; litros: number; sabores: string[]; estimado: number; real: number; rendimiento: number; diferencia: number }[] = [];

  for (const info of resumen.porLinea) {
    const real = realPorLinea.get(info.linea);
    if (real === undefined) continue; // línea sin conteo → se deja el estimado

    // Tandas del turno de esta línea (para repartir el real por litros).
    const tandas = await prisma.controlCalidad.findMany({
      where: { clase: "linea", refId: info.linea, base: { gt: 0 }, fecha: { gte: desde } },
      select: { id: true, base: true, cantidad: true, depositos: true },
    });
    const litrosLinea = tandas.reduce((s, t) => s + ((t.base as number) ?? 0), 0);
    if (litrosLinea <= 0) continue;

    // Delta de stock por sabor (real - estimado previo), para corregir bodega.
    const deltaSabor = new Map<string, number>();
    let repartidoLinea = 0;
    for (let i = 0; i < tandas.length; i++) {
      const t = tandas[i];
      const litros = (t.base as number) ?? 0;
      // La última tanda absorbe el redondeo para cuadrar el total exacto.
      const nuevoTotal = i === tandas.length - 1 ? real - repartidoLinea : Math.round(real * (litros / litrosLinea));
      repartidoLinea += nuevoTotal;

      let deps: { deposito?: string; sabor?: string; litros?: number; est?: number }[] = [];
      try { deps = JSON.parse(t.depositos ?? "[]"); } catch { deps = []; }
      const estTanda = deps.reduce((s, d) => s + (Number(d.est) || 0), 0);
      const litTanda = deps.reduce((s, d) => s + (Number(d.litros) || 0), 0);
      // Reparte el nuevo total de la tanda entre sus sabores (por est, o por litros).
      let repartidoTanda = 0;
      for (let j = 0; j < deps.length; j++) {
        const d = deps[j];
        const sabor = String(d.sabor ?? "").trim();
        if (!sabor) continue;
        const frac = estTanda > 0 ? (Number(d.est) || 0) / estTanda : litTanda > 0 ? (Number(d.litros) || 0) / litTanda : 1 / deps.length;
        const nuevoSab = j === deps.length - 1 ? nuevoTotal - repartidoTanda : Math.round(nuevoTotal * frac);
        repartidoTanda += nuevoSab;
        const previo = Math.round((Number(d.est) || 0)); // lo que se sumó a bodega al fabricar
        deltaSabor.set(sabor, (deltaSabor.get(sabor) ?? 0) + (nuevoSab - previo));
        d.est = nuevoSab; // deja el depósito con el conteo real
      }
      await prisma.controlCalidad.update({
        where: { id: t.id },
        data: { cantidad: nuevoTotal, depositos: JSON.stringify(deps), observaciones: "cierre de turno" },
      });
    }

    // Corrige el stock de bodega por la diferencia (real vs lo ya sumado al fabricar).
    if (bod) {
      for (const [sabor, delta] of deltaSabor) {
        if (delta === 0) continue;
        let saborId = (await prisma.sabor.findFirst({ where: { nombre: sabor, linea: info.linea } }))?.id;
        if (!saborId) saborId = (await prisma.sabor.create({ data: { nombre: sabor, linea: info.linea } })).id;
        await prisma.stockSabor.upsert({
          where: { saborId_ubicacionId: { saborId, ubicacionId: bod } },
          update: { cantidad: { increment: delta } },
          create: { saborId, ubicacionId: bod, cantidad: Math.max(0, delta) },
        });
        await prisma.movimientoBodega.create({
          data: {
            zona: "produccion", ubicacionId: bod, tipo: delta >= 0 ? "entrada" : "merma", clase: "sabor",
            refId: saborId, nombre: `Ajuste cierre · ${sabor} (${info.linea})`, cantidad: Math.abs(delta),
            detalle: "cuadre de cierre de turno", usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
          },
        });
      }
    }

    comparacion.push({
      linea: info.linea, litros: litrosLinea, sabores: info.sabores, estimado: info.estimado,
      real, rendimiento: Math.round((real / litrosLinea) * 100) / 100, diferencia: real - info.estimado,
    });
  }

  // Registro del cierre → historial para el panel (cruce con stock, ventas, mermas).
  const detalle = JSON.stringify({
    fecha: new Date().toISOString(),
    lineas: comparacion,
    insumos: resumen.insumos.map((i) => ({ nombre: i.nombre, unidad: i.unidad, categoria: i.categoria, cantidad: Math.round(i.cantidad * 100) / 100, porLinea: i.porLinea })),
  });
  await prisma.auditoria.create({
    data: { usuarioId: u?.sub ?? null, accion: "cierre_produccion", entidad: "Produccion", detalle },
  });

  await marcarAsistenciaAuto(u?.sub, "Cierre de turno de producción");
  revalidatePath("/produccion");
  redirect("/produccion?cierre=1");
}

/**
 * BITÁCORA de producción: el operario deja una observación (por voz o escrita),
 * ej. "queda poca esencia de vainilla" o "falta estabilizante". Se guarda como
 * Nota del área producción y, si detecta que falta/hay que reponer algo, la marca
 * como tarea de prioridad alta para que la central la vea en el panel.
 */
export async function crearNotaProduccion(formData: FormData) {
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) redirect("/produccion/bitacora");
  const u = await usuarioActual();

  const n = normalizaTexto(texto);
  let tipo: string = detectaTipoNota(n);
  let prioridad: string = detectaPrioridadNota(n);
  const accion = detectaAccionNota(n);
  const cantidad = detectaCantidad(n);
  // "Falta / queda poco / reponer" → tarea para la central.
  if (accion === "reponer" || accion === "stock_entrada" || accion === "stock_salida") {
    tipo = "tarea";
    if (prioridad === "media") prioridad = "alta";
  }

  await prisma.nota.create({
    data: {
      texto, tipo, area: "produccion", prioridad,
      autor: u?.nombre ?? "Producción",
      accion: accion === "reponer" ? "reponer" : "ninguna",
      accionEstado: "na", cantidad: cantidad ?? null,
    },
  });

  revalidatePath("/produccion/bitacora");
  revalidatePath("/admin/notas");
  redirect("/produccion/bitacora?ok=1");
}

/** Marca una observación de la bitácora como resuelta / la reabre. */
export async function toggleNotaProduccion(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/produccion/bitacora");
  const actual = await prisma.nota.findUnique({ where: { id }, select: { estado: true } });
  if (actual) {
    const hecha = actual.estado !== "hecha";
    await prisma.nota.update({ where: { id }, data: { estado: hecha ? "hecha" : "abierta", hechaEn: hecha ? new Date() : null } });
  }
  revalidatePath("/produccion/bitacora");
  revalidatePath("/admin/notas");
  redirect("/produccion/bitacora");
}
