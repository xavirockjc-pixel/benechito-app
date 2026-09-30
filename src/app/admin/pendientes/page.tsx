import { pendientesCerebro } from "@/lib/dominio/cerebroPendientes";
import PendientesCerebro from "./PendientesCerebro";

export const dynamic = "force-dynamic";

export default async function PendientesPage() {
  const items = await pendientesCerebro();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2 text-3xl">🐝</div>
      <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900">Pendientes del cerebro</h1>
      <p className="mt-1 text-sm text-slate-500">
        Lo que el sistema notó que <b>faltó actualizar o revisar</b>: cosas anotadas sin confirmar, recordatorios de hoy, caja sin cerrar o stock descuadrado. Arréglalo con un toque, u omítelo por hoy.
      </p>

      <PendientesCerebro items={items} />

      <p className="mt-6 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-400">
        💡 Esto se alimenta de las <b>notas</b> que dicta el equipo (botón 📝) y de revisar tus números. Mientras más ordenado entra todo, mejor te avisa el cerebro.
      </p>
    </div>
  );
}
