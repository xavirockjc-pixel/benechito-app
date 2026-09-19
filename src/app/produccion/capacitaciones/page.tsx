import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { urlEmbed } from "@/lib/dominio/checklists";
import { LINEAS_PRODUCCION, lineaLabel } from "@/lib/dominio/produccion";
import { identificarTrabajadorCap, salirTrabajadorCap, firmarCapacitacion } from "../actions";
import CapacitacionesUI from "./CapacitacionesUI";

export const dynamic = "force-dynamic";

export default async function CapacitacionesProduccion({ searchParams }: { searchParams: Promise<{ firmado?: string }> }) {
  const { firmado } = await searchParams;
  const cookieStore = await cookies();
  const worker = (cookieStore.get("cap_trab")?.value ?? "").trim();

  // 1) Acceso por nombre: si no se ha identificado, solo se ve esta puerta.
  if (!worker) {
    const trabajadores = await prisma.trabajador.findMany({ where: { activo: true }, select: { nombre: true }, orderBy: { nombre: "asc" } });
    return (
      <div>
        <h1 className="font-display text-xl font-extrabold text-slate-900">🎓 Capacitaciones</h1>
        <p className="mb-4 text-sm text-slate-500">Para verlas y firmarlas, identifícate con tu nombre. Tu firma queda registrada con la fecha y hora.</p>
        <form action={identificarTrabajadorCap} className="rounded-2xl border-2 border-teal-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-bold text-slate-700">¿Quién eres?
            <input name="trabajador" list="trabajadores-cap" required placeholder="Elige o escribe tu nombre"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base" />
          </label>
          <datalist id="trabajadores-cap">{trabajadores.map((t) => <option key={t.nombre} value={t.nombre} />)}</datalist>
          <button className="mt-3 w-full rounded-2xl bg-[#0f766e] py-3.5 text-base font-extrabold text-white active:brightness-110">Entrar</button>
        </form>
        <p className="mt-3 text-[11px] text-slate-400">Solo dentro del horario de trabajo (la app abre a las 8:00). Tu lectura queda tiqueada y con copia.</p>
      </div>
    );
  }

  // 2) Ya identificado: capacitaciones en pestañas por producto, con firma tiqueada.
  const caps = await prisma.capacitacion.findMany({
    where: { activo: true, rol: { in: ["produccion", "todos"] } },
    orderBy: [{ orden: "asc" }],
    include: { vistas: { select: { usuarioNombre: true, fecha: true } } },
  });

  const mkCap = (c: (typeof caps)[number]) => ({
    id: c.id, titulo: c.titulo, categoria: c.categoria, descripcion: c.descripcion,
    pasos: c.pasos, urlVideo: c.urlVideo, embed: urlEmbed(c.urlVideo),
    firmadaPorMi: c.vistas.some((v) => (v.usuarioNombre ?? "").trim() === worker),
    firmantes: c.vistas.map((v) => ({ nombre: (v.usuarioNombre ?? "—").trim(), fecha: v.fecha.toISOString() })),
  });

  const tabs: { id: string; label: string; caps: ReturnType<typeof mkCap>[] }[] = [];
  const generales = caps.filter((c) => !c.linea).map(mkCap);
  if (generales.length) tabs.push({ id: "general", label: "Generales", caps: generales });
  for (const l of LINEAS_PRODUCCION) {
    const cs = caps.filter((c) => c.linea === l).map(mkCap);
    if (cs.length) tabs.push({ id: l, label: lineaLabel[l] ?? l, caps: cs });
  }
  // Líneas personalizadas que no estén en la lista estándar.
  const conocidas = new Set<string | null>([null, ...LINEAS_PRODUCCION]);
  const otras = [...new Set(caps.map((c) => c.linea).filter((l): l is string => !!l && !conocidas.has(l)))];
  for (const l of otras) tabs.push({ id: l, label: lineaLabel[l] ?? l, caps: caps.filter((c) => c.linea === l).map(mkCap) });

  return (
    <div>
      <h1 className="font-display text-xl font-extrabold text-slate-900">🎓 Capacitaciones</h1>
      <p className="mb-3 text-sm text-slate-500">Lee cada una y fírmala. Queda tiqueada a tu nombre, con copia y fecha.</p>
      {firmado && <p className="mb-3 rounded-xl border border-green-300 bg-green-50 px-3 py-2 text-sm font-bold text-green-700">✓ Firmada. ¡Gracias!</p>}
      <CapacitacionesUI worker={worker} tabs={tabs} firmar={firmarCapacitacion} salir={salirTrabajadorCap} />
    </div>
  );
}
