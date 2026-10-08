import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LINEAS_PRODUCCION, lineaLabel, PERFIL_LINEA, ORDEN_LINEAS } from "@/lib/dominio/produccion";
import { guardarPinesProduccion } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProduccionPinesPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const empresa = await prisma.empresa.findFirst({ select: { pinesProduccion: true } });
  let pines: Record<string, string> = {};
  try { pines = empresa?.pinesProduccion ? JSON.parse(empresa.pinesProduccion) : {}; } catch { pines = {}; }

  const orden = [
    ...ORDEN_LINEAS.filter((l) => (LINEAS_PRODUCCION as readonly string[]).includes(l)),
    ...LINEAS_PRODUCCION.filter((l) => !ORDEN_LINEAS.includes(l)),
  ];

  async function guardar(formData: FormData) {
    "use server";
    await guardarPinesProduccion(formData);
    redirect("/admin/produccion-pines?ok=1");
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">🔒 Códigos por producto</h1>
      <p className="text-sm text-slate-500">
        Pon un código (PIN) a cada producto en la app de Producción. Quien quiera abrir
        esa ventana tendrá que escribirlo. Deja en blanco los que no quieras bloquear.
      </p>

      {ok && <p className="mt-3 rounded-xl bg-green-100 px-4 py-2.5 text-sm font-bold text-green-700">✓ Códigos guardados.</p>}

      <form action={guardar} className="mt-5 space-y-2">
        {orden.map((l) => {
          const p = PERFIL_LINEA[l];
          const c = p?.color ?? "#0f766e";
          return (
            <label key={l} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <span className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg text-lg" style={{ background: `${c}1a` }}>{p?.icono ?? "📦"}</span>
                <span className="text-sm font-bold" style={{ color: c }}>{lineaLabel[l] ?? l}</span>
              </span>
              <input
                name={`pin_${l}`}
                defaultValue={pines[l] ?? ""}
                inputMode="numeric"
                maxLength={8}
                placeholder="Sin código"
                className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-center text-base font-semibold tracking-widest"
              />
            </label>
          );
        })}
        <button className="mt-2 w-full rounded-xl bg-[#0f766e] py-3 text-sm font-extrabold text-white active:brightness-95">
          Guardar códigos
        </button>
      </form>

      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
        💡 Es un bloqueo simple para que cada quien entre solo a su producto y no se confundan
        las ventanas. No reemplaza la clave de la app. El pago por producción no se ve en el
        tablet: se calcula solo aquí en la central.
      </p>
    </div>
  );
}
