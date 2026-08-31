import { tipoAsistenciaColor, tipoAsistenciaIcono, tipoAsistenciaLabel } from "@/lib/dominio/equipo";

type Asist = { fecha: Date; tipo: string; horas: number; horasExtra: number };

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
const claveDia = (d: Date) => new Date(d).toLocaleDateString("en-CA"); // yyyy-mm-dd local

/**
 * Calendario del mes en curso: cada día pintado según el tipo de asistencia.
 * Muestra ícono del tipo y, si trabajó, las horas del día.
 */
export default function CalendarioAsistencia({ asistencias }: { asistencias: Asist[] }) {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const primero = new Date(anio, mes, 1);
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const offset = (primero.getDay() + 6) % 7; // lunes = 0

  // Un registro por día (el más reciente si hubiera varios).
  const porDia = new Map<string, Asist>();
  for (const a of asistencias) {
    const k = claveDia(a.fecha);
    if (!porDia.has(k)) porDia.set(k, a);
  }

  const celdas: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];
  const nombreMes = primero.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  const tiposPresentes = [...new Set(asistencias.map((a) => a.tipo))];

  return (
    <div>
      <p className="mb-2 text-center text-sm font-bold capitalize text-slate-600">{nombreMes}</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DIAS.map((d, i) => (
          <div key={i} className="text-[10px] font-bold uppercase text-slate-400">{d}</div>
        ))}
        {celdas.map((dia, i) => {
          if (dia == null) return <div key={i} />;
          const k = claveDia(new Date(anio, mes, dia));
          const a = porDia.get(k);
          const esHoy = dia === hoy.getDate();
          const base = "flex aspect-square flex-col items-center justify-center rounded-lg border text-[11px]";
          if (!a) {
            return (
              <div key={i} className={`${base} border-slate-100 text-slate-400 ${esHoy ? "ring-2 ring-slate-300" : ""}`}>
                {dia}
              </div>
            );
          }
          return (
            <div
              key={i}
              title={`${dia} · ${tipoAsistenciaLabel[a.tipo] ?? a.tipo}${a.horas > 0 ? ` · ${a.horas} h` : ""}`}
              className={`${base} ${tipoAsistenciaColor[a.tipo] ?? "bg-slate-100 text-slate-700 border-slate-200"} ${esHoy ? "ring-2 ring-slate-400" : ""}`}
            >
              <span className="font-bold leading-none">{dia}</span>
              <span className="leading-none">{tipoAsistenciaIcono[a.tipo]}</span>
              {a.horas > 0 && <span className="text-[9px] font-semibold leading-none">{a.horas}h{a.horasExtra > 0 ? "+" : ""}</span>}
            </div>
          );
        })}
      </div>
      {tiposPresentes.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
          {tiposPresentes.map((tp) => (
            <span key={tp}>{tipoAsistenciaIcono[tp]} {tipoAsistenciaLabel[tp] ?? tp}</span>
          ))}
        </div>
      )}
    </div>
  );
}
