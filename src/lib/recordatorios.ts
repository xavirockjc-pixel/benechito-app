import { prisma } from "@/lib/prisma";

/**
 * Motor de recordatorios: calcula a quién avisar hoy y arma el mensaje de WhatsApp.
 * Lo usan la página /admin/recordatorios (envío con un toque) y el endpoint
 * /api/recordatorios (envío automático vía n8n).
 *
 * Tres tipos:
 *  - reposicion: puntos con próxima reposición hoy o vencida (próx. 3 días).
 *  - cobro: clientes con ventas pendientes/parciales/vencidas.
 *  - preventa: preventas enviadas sin respuesta hace 2+ días.
 */

export type TipoRecordatorio = "reposicion" | "cobro" | "preventa";

export type Recordatorio = {
  tipo: TipoRecordatorio;
  negocioId: string;
  negocio: string;
  contacto: string;
  whatsapp: string; // solo dígitos, formato internacional (56...)
  detalle: string;
  monto?: number;
  mensaje: string;
};

const soloDigitos = (s: string) => (s || "").replace(/\D/g, "");
const capit = (s: string) => (s ? s.split(" ")[0] : "");

function msgReposicion(contacto: string, negocio: string) {
  return `Hola ${capit(contacto) || negocio} 👋 aquí Benechito 🍫 ¿Te repongo el pedido esta semana? Dime qué necesitas y lo dejo listo.`;
}
function msgCobro(contacto: string, negocio: string, monto: number) {
  const m = monto > 0 ? ` de $${Math.round(monto).toLocaleString("es-CL")}` : "";
  return `Hola ${capit(contacto) || negocio} 👋 aquí Benechito. Te recuerdo con cariño el saldo pendiente${m}. ¿Coordinamos el pago? ¡Gracias! 🐝`;
}
function msgPreventa(contacto: string, negocio: string) {
  return `Hola ${capit(contacto) || negocio} 👋 te escribí de Benechito hace unos días 🍫 ¿Alcanzaste a ver? ¿Te preparo algo para esta semana?`;
}

export async function getRecordatorios(): Promise<{
  reposicion: Recordatorio[]; cobro: Recordatorio[]; preventa: Recordatorio[]; resumen: string; total: number;
}> {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const en3 = new Date(hoy); en3.setDate(en3.getDate() + 3); en3.setHours(23, 59, 59, 999);
  const hace2 = new Date(hoy); hace2.setDate(hace2.getDate() - 2);

  const safe = async <T,>(fn: () => Promise<T>, def: T): Promise<T> => { try { return await fn(); } catch { return def; } };

  // 1. Reposición de puntos.
  const negRepo = await safe(
    () => prisma.negocio.findMany({
      where: { proximaReposicion: { not: null, lte: en3 }, estado: { in: ["punto_activo", "reposicion"] } },
      select: { id: true, nombreNegocio: true, nombreContacto: true, whatsapp: true, proximaReposicion: true },
      orderBy: { proximaReposicion: "asc" }, take: 50,
    }),
    [] as { id: string; nombreNegocio: string; nombreContacto: string; whatsapp: string; proximaReposicion: Date | null }[],
  );
  const reposicion: Recordatorio[] = negRepo.map((n) => {
    const venc = n.proximaReposicion && new Date(n.proximaReposicion) < hoy;
    return {
      tipo: "reposicion", negocioId: n.id, negocio: n.nombreNegocio, contacto: n.nombreContacto,
      whatsapp: soloDigitos(n.whatsapp),
      detalle: venc ? "reposición vencida" : "reposición esta semana",
      mensaje: msgReposicion(n.nombreContacto, n.nombreNegocio),
    };
  });

  // 2. Cobros: ventas pendientes/parciales/vencidas por cliente.
  const pend = await safe(
    () => prisma.venta.groupBy({ by: ["negocioId"], _sum: { total: true }, _count: true, where: { estadoPago: { in: ["pendiente", "parcial", "vencido"] } } }),
    [] as { negocioId: string; _sum: { total: unknown }; _count: number }[],
  );
  const idsCobro = pend.map((p) => p.negocioId);
  const negCobro = idsCobro.length
    ? await safe(() => prisma.negocio.findMany({ where: { id: { in: idsCobro } }, select: { id: true, nombreNegocio: true, nombreContacto: true, whatsapp: true } }), [])
    : [];
  const negMap = new Map(negCobro.map((n) => [n.id, n]));
  const cobro: Recordatorio[] = pend
    .filter((p) => negMap.has(p.negocioId))
    .map((p) => {
      const n = negMap.get(p.negocioId)!;
      const monto = Number(p._sum.total ?? 0);
      return {
        tipo: "cobro" as TipoRecordatorio, negocioId: n.id, negocio: n.nombreNegocio, contacto: n.nombreContacto,
        whatsapp: soloDigitos(n.whatsapp), detalle: `${p._count} venta(s) por cobrar`, monto,
        mensaje: msgCobro(n.nombreContacto, n.nombreNegocio, monto),
      };
    })
    .sort((a, b) => (b.monto ?? 0) - (a.monto ?? 0));

  // 3. Preventa sin respuesta hace 2+ días.
  const pre = await safe(
    () => prisma.preventa.findMany({
      where: { estado: { in: ["enviada", "sin_respuesta"] }, createdAt: { lt: hace2 } },
      select: { id: true, negocio: { select: { id: true, nombreNegocio: true, nombreContacto: true, whatsapp: true } } },
      orderBy: { createdAt: "asc" }, take: 50,
    }),
    [] as { id: string; negocio: { id: string; nombreNegocio: string; nombreContacto: string; whatsapp: string } | null }[],
  );
  const preventa: Recordatorio[] = pre
    .filter((p) => p.negocio)
    .map((p) => ({
      tipo: "preventa" as const, negocioId: p.negocio!.id, negocio: p.negocio!.nombreNegocio, contacto: p.negocio!.nombreContacto,
      whatsapp: soloDigitos(p.negocio!.whatsapp), detalle: "preventa sin respuesta",
      mensaje: msgPreventa(p.negocio!.nombreContacto, p.negocio!.nombreNegocio),
    }));

  // Resumen para el dueño.
  const L: string[] = [`🔔 *Recordatorios de hoy · Benechito*`];
  if (reposicion.length) L.push(`\n🔁 *Reponer (${reposicion.length}):*\n` + reposicion.slice(0, 10).map((r) => `   • ${r.negocio} (${r.detalle})`).join("\n"));
  if (cobro.length) L.push(`\n💵 *Cobrar (${cobro.length}):*\n` + cobro.slice(0, 10).map((r) => `   • ${r.negocio}: $${Math.round(r.monto ?? 0).toLocaleString("es-CL")}`).join("\n"));
  if (preventa.length) L.push(`\n📲 *Seguir preventa (${preventa.length}):*\n` + preventa.slice(0, 10).map((r) => `   • ${r.negocio}`).join("\n"));
  const total = reposicion.length + cobro.length + preventa.length;
  if (total === 0) L.push(`\n✅ Nada pendiente hoy. ¡Buen trabajo!`);
  L.push(`\n🐝 Tu socio Panal · benechito.com/admin/recordatorios`);

  return { reposicion, cobro, preventa, resumen: L.join("\n"), total };
}
