import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ubicacionBodegaId, ubicacionProduccionId } from "@/lib/dominio/ubicaciones";
import { devolverBodegaAProduccion, vaciarBodegaCero, cuadrarItem } from "./actions";
import AccionConfirm from "./AccionConfirm";
import { usuarioActual } from "@/lib/auth";
import { ROLES_FULL } from "@/lib/dominio/permisos";

export const dynamic = "force-dynamic";

type Fila = { key: string; nombre: string; clase: string; produccion: number; bodega: number };

export default async function CompararStock() {
  const u = await usuarioActual();
  const esDueno = ROLES_FULL.includes(u?.rol ?? "");
  const [prodUb, bodUb] = await Promise.all([ubicacionProduccionId(), ubicacionBodegaId()]);

  const [sabProd, sabBod, pProd, pBod] = await Promise.all([
    prodUb ? prisma.stockSabor.findMany({ where: { ubicacionId: prodUb }, include: { sabor: { select: { nombre: true } } } }) : [],
    bodUb ? prisma.stockSabor.findMany({ where: { ubicacionId: bodUb }, include: { sabor: { select: { nombre: true } } } }) : [],
    prodUb ? prisma.stock.findMany({ where: { ubicacionId: prodUb }, include: { producto: { select: { nombre: true } } } }) : [],
    bodUb ? prisma.stock.findMany({ where: { ubicacionId: bodUb }, include: { producto: { select: { nombre: true } } } }) : [],
  ]);

  const mapa = new Map<string, Fila>();
  const get = (key: string, nombre: string, clase: string) =>
    mapa.get(key) ?? mapa.set(key, { key, nombre, clase, produccion: 0, bodega: 0 }).get(key)!;

  for (const s of sabProd) get(`sab:${s.saborId}`, s.sabor.nombre, "Sabor").produccion += s.cantidad;
  for (const s of sabBod) get(`sab:${s.saborId}`, s.sabor.nombre, "Sabor").bodega += s.cantidad;
  for (const s of pProd) get(`prod:${s.productoId}`, s.producto.nombre, "Producto").produccion += s.cantidad;
  for (const s of pBod) get(`prod:${s.productoId}`, s.producto.nombre, "Producto").bodega += s.cantidad;

  const filas = [...mapa.values()]
    .filter((f) => f.produccion !== 0 || f.bodega !== 0)
    .sort((a, b) => b.produccion - a.produccion || a.nombre.localeCompare(b.nombre));

  const totProd = filas.reduce((s, f) => s + f.produccion, 0);
  const totBod = filas.reduce((s, f) => s + f.bodega, 0);
  const porRecibir = filas.filter((f) => f.produccion > 0);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">⚖️ Comparar stock: Producción ↔ Bodega</h1>
      <p className="text-sm text-slate-500">
        Lo que Producción fabricó y aún no se recibe en bodega, y lo que ya está en bodega. Así los números cuadran.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label="Por recibir (Producción)" valor={`${totProd} u.`} color="#f28a1e" />
        <Kpi label="En bodega" valor={`${totBod} u.`} color="#0f766e" />
        <Kpi label="Ítems por recibir" valor={`${porRecibir.length}`} color={porRecibir.length > 0 ? "#e23b2c" : "#2f9e44"} />
      </div>

      {porRecibir.length > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <span className="text-sm font-bold text-amber-800">Hay {porRecibir.length} ítem(s) en producción sin recibir.</span>
          <Link href="/bodega/recibir" className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">Recibir en bodega →</Link>
        </div>
      )}

      {/* Arrancar bodega desde cero (dos formas) — solo dueño/admin */}
      {esDueno && (
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-slate-900">🔄 Arrancar bodega desde cero</p>
        <p className="mt-0.5 text-[11px] text-slate-500">Para partir limpio. Nada se borra del historial; queda el registro del movimiento.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <AccionConfirm
            action={devolverBodegaAProduccion}
            confirmMsg="¿Devolver TODO el stock de bodega a producción? Bodega queda en 0 y el bodeguero lo recibe de nuevo."
            className="w-full rounded-xl bg-[#0f766e] px-3 py-2.5 text-sm font-bold text-white active:brightness-95">
            Devolver todo a producción
          </AccionConfirm>
          <AccionConfirm
            action={vaciarBodegaCero}
            confirmMsg="¿Dejar bodega en 0 (vaciar)? No se manda a producción; el bodeguero recibe desde producción lo que haya."
            className="w-full rounded-xl border-2 border-rose-300 px-3 py-2.5 text-sm font-bold text-rose-600 active:bg-rose-50">
            Vaciar bodega a 0
          </AccionConfirm>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          <b>Devolver a producción</b>: lo de bodega vuelve a producción para que el bodeguero lo “pase” (reciba) ordenado.
          <b> Vaciar a 0</b>: bodega parte limpia y se llena recibiendo desde producción.
        </p>
      </div>
      )}

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {filas.length === 0 ? (
          <p className="text-sm text-slate-500">No hay stock registrado todavía.</p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-slate-100 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <span>Producto / sabor</span>
              <span className="text-right">Producción</span>
              <span className="text-right">Bodega</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {filas.map((f) => {
                const mclase = f.key.startsWith("sab") ? "sab" : "prod";
                const refId = f.key.slice(f.key.indexOf(":") + 1);
                return (
                  <li key={f.key} className={`grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-1.5 text-sm ${f.produccion > 0 ? "bg-amber-50/60" : ""}`}>
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-800">{f.nombre}</span>
                      <span className="block text-[10px] text-slate-400">{f.clase}</span>
                    </span>
                    <span className="flex items-center justify-end gap-1.5">
                      <span className={`font-extrabold ${f.produccion > 0 ? "text-amber-600" : "text-slate-300"}`}>{f.produccion}</span>
                      {esDueno && f.produccion > 0 && (
                        <AccionConfirm action={cuadrarItem} hidden={{ clase: mclase, refId, donde: "produccion" }}
                          confirmMsg={`¿Poner en 0 "${f.nombre}" en producción? (para cuadrar lo que no llegó a bodega)`}
                          className="rounded border border-amber-300 px-1.5 text-[10px] font-bold text-amber-600 active:bg-amber-50">0</AccionConfirm>
                      )}
                    </span>
                    <span className="flex items-center justify-end gap-1.5">
                      <span className="font-semibold text-[#0f766e]">{f.bodega}</span>
                      {esDueno && f.bodega > 0 && (
                        <AccionConfirm action={cuadrarItem} hidden={{ clase: mclase, refId, donde: "bodega" }}
                          confirmMsg={`¿Poner en 0 "${f.nombre}" en bodega?`}
                          className="rounded border border-slate-300 px-1.5 text-[10px] font-bold text-slate-500 active:bg-slate-50">0</AccionConfirm>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-1 grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-t border-slate-200 pt-1.5 text-sm font-extrabold">
              <span className="text-slate-700">Total</span>
              <span className="text-right text-amber-600">{totProd}</span>
              <span className="text-right text-[#0f766e]">{totBod}</span>
            </div>
          </>
        )}
      </section>

      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
        💡 La columna <b>Producción</b> es lo fabricado que todavía no entra a bodega (pendiente de recibir). La columna
        <b> Bodega</b> es lo que ya está disponible para vender y distribuir. Cuando el bodeguero recibe, baja de
        Producción y sube a Bodega.
      </p>
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-xl font-extrabold leading-tight" style={{ color }}>{valor}</p>
    </div>
  );
}
