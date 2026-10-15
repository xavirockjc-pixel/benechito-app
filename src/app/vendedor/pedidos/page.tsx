import { prisma } from "@/lib/prisma";
import { inicioDelDia } from "@/lib/dominio/empresa";
import CapturaPedido from "./CapturaPedido";
import RutaReparto from "./RutaReparto";

export const dynamic = "force-dynamic";

export default async function PedidosReparto() {
  const hoy = await inicioDelDia();
  const [ruta, entregados] = await Promise.all([
    prisma.pedidoReparto.findMany({ where: { estado: { in: ["pendiente", "en_ruta"] } }, orderBy: { orden: "asc" }, take: 100 }),
    prisma.pedidoReparto.count({ where: { estado: "entregado", entregadoEn: { gte: hoy } } }),
  ]);

  const pedidos = ruta.map((p) => ({
    id: p.id, cliente: p.cliente, telefono: p.telefono, pedido: p.pedido,
    monto: p.monto ? Number(p.monto) : null, estadoPago: p.estadoPago,
    lat: p.lat, lng: p.lng, mapsUrl: p.mapsUrl,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🛵 Pedidos por WhatsApp</h1>
        <p className="text-xs text-slate-500">Pega el pedido, arma la ruta ordenada y avisa al cliente. {entregados > 0 && `· ${entregados} entregados hoy`}</p>
      </div>

      <CapturaPedido />

      <section>
        <h2 className="mb-2 text-sm font-bold text-slate-900">🗺️ Ruta de hoy ({pedidos.length})</h2>
        <RutaReparto pedidos={pedidos} />
      </section>
    </div>
  );
}
