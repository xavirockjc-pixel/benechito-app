// Bot analista: revisa el negocio y arma un mensaje corto con lo importante del
// día (ventas vs ayer, facturas por enviar) + los avisos del cerebro. Solo lee.
import { prisma } from "@/lib/prisma";
import { pendientesCerebro, type PendienteCerebro } from "@/lib/dominio/cerebroPendientes";
import { fmtCLP } from "@/lib/dominio/pedidos";

const safe = async <T,>(fn: () => Promise<T>, def: T): Promise<T> => {
  try { return await fn(); } catch { return def; }
};

export type Analisis = {
  ventasHoy: number; nVentasHoy: number;
  ventasAyer: number;
  facturasPorEnviar: number;
  alertas: PendienteCerebro[];
  texto: string;
};

/** Analiza el negocio y devuelve los números clave + avisos + un texto listo para enviar. */
export async function analizarNegocio(): Promise<Analisis> {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const ayer = new Date(hoy.getTime() - 24 * 3600 * 1000);

  const [vHoy, vAyer, alertas, facturasPorEnviar] = await Promise.all([
    safe(() => prisma.venta.aggregate({ _sum: { total: true }, _count: true, where: { fecha: { gte: hoy } } }), { _sum: { total: null }, _count: 0 } as { _sum: { total: unknown }; _count: number }),
    safe(() => prisma.venta.aggregate({ _sum: { total: true }, where: { fecha: { gte: ayer, lt: hoy } } }), { _sum: { total: null } } as { _sum: { total: unknown } }),
    safe(() => pendientesCerebro(), [] as PendienteCerebro[]),
    // Facturas/boletas emitidas que aún no se marcaron como enviadas al cliente.
    safe(() => prisma.documentoVenta.count({ where: { tipo: { in: ["boleta", "factura"] }, estado: { in: ["emitido", "enviado", "pagado"] }, fechaEnvio: null } }), 0),
  ]);

  const ventasHoy = Number(vHoy._sum.total ?? 0);
  const nVentasHoy = Number(vHoy._count ?? 0);
  const ventasAyer = Number(vAyer._sum.total ?? 0);

  // --- Arma el texto (Markdown de Telegram) ---
  const fecha = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" });
  const L: string[] = [`🐝 *Benechito · Analista* — ${fecha}`, ""];

  L.push(`💰 Ventas hoy: *${fmtCLP(ventasHoy)}* (${nVentasHoy}) · ayer: ${fmtCLP(ventasAyer)}`);
  const hora = new Date().getHours();
  if (ventasAyer > 0 && hora >= 15 && ventasHoy < ventasAyer * 0.5) {
    L.push("⚠️ Van *bajas* respecto a ayer a esta hora.");
  }

  // Avisos del cerebro (alertas primero).
  const orden = { alerta: 0, aviso: 1, info: 2 } as const;
  const sorted = [...alertas].sort((a, b) => orden[a.tono] - orden[b.tono]);
  L.push("");
  if (sorted.length === 0) {
    L.push("✅ Sin pendientes del cerebro.");
  } else {
    L.push("*Avisos:*");
    for (const a of sorted.slice(0, 10)) L.push(`${a.icono} ${a.titulo}`);
  }

  if (facturasPorEnviar > 0) {
    L.push("");
    L.push(`🧾 Facturas/boletas por enviar al cliente: *${facturasPorEnviar}*`);
  }

  return { ventasHoy, nVentasHoy, ventasAyer, facturasPorEnviar, alertas: sorted, texto: L.join("\n") };
}
