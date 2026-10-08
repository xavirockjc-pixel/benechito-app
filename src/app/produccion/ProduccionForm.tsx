"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LINEAS_PRODUCCION, lineaLabel, PERFIL_LINEA, ORDEN_LINEAS } from "@/lib/dominio/produccion";
import { registrarProduccion } from "./actions";

type Fila = { key: number; nombre: string; cantidad: string };

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

const NUMS: Record<string, number> = {
  cero: 0, un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, docena: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50,
  sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, trescientos: 300,
  cuatrocientos: 400, quinientos: 500, mil: 1000,
};

/** Extrae pares (cantidad, sabor) de una frase: "treinta frutilla, veinte pistacho". */
function parsearProduccion(texto: string): { nombre: string; cantidad: number }[] {
  const partes = texto.toLowerCase().split(/,| y /);
  const out: { nombre: string; cantidad: number }[] = [];
  for (const parte of partes) {
    const toks = parte.trim().replace(/[.]/g, "").split(/\s+/).filter(Boolean);
    let cant = 0;
    const resto: string[] = [];
    for (const t of toks) {
      if (/^\d+$/.test(t)) { cant = parseInt(t, 10); continue; }
      if (NUMS[t] != null) { cant += NUMS[t]; continue; }
      resto.push(t);
    }
    const nombre = resto.join(" ").trim();
    if (nombre && cant > 0) out.push({ nombre, cantidad: cant });
  }
  return out;
}

const TURNOS = [
  { id: "1", label: "1er turno" },
  { id: "2", label: "2do turno" },
  { id: "3", label: "3er turno" },
];

/**
 * Producción ordenada por PRODUCTO (tablet compartido): primero se elige el producto
 * (cada uno su ventana con su color), luego quién lo hizo, cuántos y de qué (por voz).
 * Botón ← Volver para que entre el siguiente. Cada reporte queda con el nombre.
 */
export default function ProduccionForm({ saboresPorLinea = {}, equipo = [], recomendaciones = {}, pines = {} }: {
  saboresPorLinea?: Record<string, string[]>;
  equipo?: { id: string; nombre: string }[];
  recomendaciones?: Record<string, string[]>;
  pines?: Record<string, string>; // {linea: pin} — si el producto tiene pin, pide código para abrir
}) {
  const [turno, setTurno] = useState("1");
  const [linea, setLinea] = useState<string>(""); // "" = pantalla de elegir producto
  // Bloqueo por PIN: producto que espera código + lo tecleado + error.
  const [pinPara, setPinPara] = useState<string>("");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  // Abre el producto; si tiene PIN configurado, primero pide el código.
  const abrirLinea = (l: string) => {
    const pin = pines[l];
    if (pin) { setPinPara(l); setPinInput(""); setPinError(false); }
    else setLinea(l);
  };
  const confirmarPin = () => {
    if (pinInput.trim() === (pines[pinPara] ?? "")) { setLinea(pinPara); setPinPara(""); setPinInput(""); setPinError(false); }
    else setPinError(true);
  };
  const [nuevoTipo, setNuevoTipo] = useState("");
  const esNuevo = linea === "__nuevo__";
  const lineaFinal = esNuevo ? nuevoTipo.trim() : linea;
  const cfg = esNuevo || !linea ? null : PERFIL_LINEA[linea];
  const accent = cfg?.color ?? "#0f766e";
  // Nombres de quién(es) lo hizo: se ESCRIBEN y se agregan (no lista fija). Se recuerdan por producto.
  const [nombres, setNombres] = useState<string[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const agregarNombre = (n: string) => {
    const v = n.trim();
    if (!v) return;
    setNombres((s) => (s.some((x) => x.toLowerCase() === v.toLowerCase()) ? s : [...s, v]));
    setNuevoNombre("");
  };
  const quitarNombre = (n: string) => setNombres((s) => s.filter((x) => x !== n));
  const saboresTipo = esNuevo ? [] : (saboresPorLinea[linea] ?? []);
  const [filas, setFilas] = useState<Fila[]>([{ key: 1, nombre: "", cantidad: "" }]);
  const [litros, setLitros] = useState("");
  const [overrun, setOverrun] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Recuerda por producto: nombres del equipo (en este tablet).
  useEffect(() => {
    if (!linea || esNuevo) return;
    let noms: string[] = [];
    try {
      const rawN = localStorage.getItem(`prod-nombres-${linea}`);
      if (rawN) noms = JSON.parse(rawN);
    } catch { /* sin storage */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNombres(Array.isArray(noms) ? noms : []);
  }, [linea, esNuevo]);

  useEffect(() => {
    if (!linea || esNuevo) return;
    try { localStorage.setItem(`prod-nombres-${linea}`, JSON.stringify(nombres)); } catch { /* */ }
  }, [nombres, linea, esNuevo]);
  const recRef = useRef<SpeechRec | null>(null);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);

  const lineasOrdenadas = [...ORDEN_LINEAS.filter((l) => (LINEAS_PRODUCCION as readonly string[]).includes(l)), ...LINEAS_PRODUCCION.filter((l) => !ORDEN_LINEAS.includes(l))];

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    recRef.current = rec;
  }, []);

  const setFila = (key: number, patch: Partial<Fila>) => setFilas((f) => f.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const addFila = () => setFilas((f) => [...f, { key: Date.now() + f.length, nombre: "", cantidad: "" }]);
  const delFila = (key: number) => setFilas((f) => (f.length > 1 ? f.filter((x) => x.key !== key) : f));

  // Volver a elegir producto: limpia lo del reporte (los nombres/valor se recuerdan por producto).
  const volver = () => {
    setLinea(""); setNuevoTipo(""); setNuevoNombre(""); setFilas([{ key: 1, nombre: "", cantidad: "" }]);
    setLitros(""); setOverrun(""); setObservaciones("");
  };

  const escuchar = () => {
    const rec = recRef.current;
    if (!rec || escuchando) return;
    rec.onresult = (e) => {
      const items = parsearProduccion(e.results[0][0].transcript);
      if (items.length) setFilas((f) => {
        const limpias = f.filter((x) => x.nombre.trim() || x.cantidad.trim());
        return [...limpias, ...items.map((it, i) => ({ key: Date.now() + i, nombre: it.nombre, cantidad: String(it.cantidad) }))];
      });
    };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    try { rec.start(); setEscuchando(true); } catch { setEscuchando(false); }
  };

  const items = filas
    .map((f) => ({ nombre: f.nombre.trim(), cantidad: Number(f.cantidad.replace(/[^0-9]/g, "")) || 0 }))
    .filter((i) => i.nombre && i.cantidad > 0);
  const total = items.reduce((s, i) => s + i.cantidad, 0);
  const listo = total > 0 && lineaFinal.length > 0 && nombres.length > 0;
  const notasRec = esNuevo ? [] : [...(recomendaciones["__todas__"] ?? []), ...(recomendaciones[linea] ?? [])];

  // ===== Pantalla 1: elegir producto (ventana por producto, con su color) =====
  if (!linea) {
    const pinCfg = pinPara ? PERFIL_LINEA[pinPara] : null;
    const pinColor = pinCfg?.color ?? "#0f766e";
    return (
      <div>
        <p className="mb-3 text-sm font-bold text-slate-700">¿Qué vas a reportar? Elige el producto 👇</p>
        <div className="grid grid-cols-2 gap-3">
          {lineasOrdenadas.map((l) => {
            const p = PERFIL_LINEA[l];
            const c = p?.color ?? "#0f766e";
            return (
              <button key={l} type="button" onClick={() => abrirLinea(l)}
                className="relative flex flex-col items-center gap-1 rounded-2xl border-2 bg-white p-4 text-center shadow-sm transition active:scale-95"
                style={{ borderColor: c }}>
                {pines[l] && <span className="absolute right-2 top-2 text-sm" title="Protegido con código">🔒</span>}
                <span className="grid h-12 w-12 place-items-center rounded-xl text-2xl" style={{ background: `${c}1a` }}>{p?.icono ?? "📦"}</span>
                <span className="text-sm font-extrabold" style={{ color: c }}>{lineaLabel[l] ?? l}</span>
              </button>
            );
          })}
          <button type="button" onClick={() => setLinea("__nuevo__")}
            className="flex flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 text-center text-slate-500 shadow-sm active:scale-95">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-2xl">➕</span>
            <span className="text-sm font-extrabold">Nuevo producto</span>
          </button>
        </div>

        {/* Modal de PIN para abrir un producto protegido */}
        {pinPara && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={() => setPinPara("")}>
            <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <p className="flex items-center gap-2 text-base font-extrabold" style={{ color: pinColor }}>
                <span className="text-2xl">{pinCfg?.icono ?? "🔒"}</span>
                {lineaLabel[pinPara] ?? pinPara}
              </p>
              <p className="mt-1 text-xs text-slate-500">Escribe el código para abrir este producto.</p>
              <input
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") confirmarPin(); }}
                inputMode="numeric"
                autoFocus
                type="password"
                placeholder="Código"
                className={`mt-3 w-full rounded-xl border-2 px-3 py-3 text-center text-xl font-bold tracking-widest ${pinError ? "border-rose-400" : "border-slate-300"}`}
              />
              {pinError && <p className="mt-1 text-center text-xs font-bold text-rose-600">Código incorrecto</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setPinPara("")} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-bold text-slate-600">Cancelar</button>
                <button type="button" onClick={confirmarPin} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: pinColor }}>Abrir</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== Pantalla 2: la ventana del producto elegido =====
  return (
    <form action={registrarProduccion} className="overflow-hidden rounded-2xl border-2 bg-white shadow-sm" style={{ borderColor: accent }}>
      <input type="hidden" name="turno" value={turno} />
      <input type="hidden" name="linea" value={lineaFinal} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="nombres" value={nombres.join(",")} />
      <input type="hidden" name="litros" value={litros} />
      <input type="hidden" name="overrun" value={overrun} />
      <input type="hidden" name="observaciones" value={observaciones} />

      {/* Encabezado del producto (color propio) + Volver */}
      <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: accent }}>
        <button type="button" onClick={volver} className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-bold active:bg-white/30">← Volver</button>
        <span className="text-2xl">{cfg?.icono ?? "➕"}</span>
        <span className="text-lg font-extrabold">{esNuevo ? "Nuevo producto" : (lineaLabel[linea] ?? linea)}</span>
      </div>

      <div className="space-y-4 p-4">
        {esNuevo && (
          <input value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} placeholder="Nombre del producto nuevo (ej: Sándwich de helado)"
            className="w-full rounded-lg border-2 px-3 py-2.5 text-sm" style={{ borderColor: accent }} />
        )}
        {cfg?.hint && <p className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: `${accent}14`, color: accent }}>💡 {cfg.hint}</p>}

        {/* Turno */}
        <div>
          <p className="mb-1.5 text-sm font-bold text-slate-700">Turno</p>
          <div className="flex gap-2">
            {TURNOS.map((t) => (
              <button key={t.id} type="button" onClick={() => setTurno(t.id)}
                className="flex-1 rounded-xl border-2 py-2 text-sm font-bold"
                style={turno === t.id ? { borderColor: accent, background: `${accent}14`, color: accent } : { borderColor: "#e2e8f0", color: "#64748b" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ¿Quién lo produjo? Se ESCRIBE y se agrega (varios). Se recuerda por producto. */}
        <div className={`rounded-xl border-2 p-3 ${nombres.length === 0 ? "border-amber-300 bg-amber-50" : ""}`}
          style={nombres.length > 0 ? { borderColor: `${accent}55`, background: `${accent}0d` } : undefined}>
          <p className="mb-2 text-sm font-extrabold text-slate-700">👤 ¿Quién lo hizo? {nombres.length === 0 && <span className="font-bold text-amber-600">— escribe el nombre y agrega</span>}</p>
          {nombres.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {nombres.map((n) => (
                <span key={n} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold text-white" style={{ background: accent }}>
                  {n}
                  <button type="button" onClick={() => quitarNombre(n)} aria-label="Quitar" className="ml-0.5 text-white/80">✕</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} list="equipo-sug"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarNombre(nuevoNombre); } }}
              placeholder="Nombre de la persona"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <button type="button" onClick={() => agregarNombre(nuevoNombre)}
              className="shrink-0 rounded-lg px-4 py-2.5 text-sm font-extrabold text-white active:scale-95" style={{ background: accent }}>➕ Agregar</button>
          </div>
          <datalist id="equipo-sug">{equipo.map((e) => <option key={e.id} value={e.nombre} />)}</datalist>
          {nombres.length > 1 && <p className="mt-2 text-[11px] font-semibold text-amber-600">👥 Fue en equipo ({nombres.length}): se reparte entre ellos.</p>}
          <p className="mt-1 text-[11px] text-slate-400">Queda recordado para este producto; el siguiente solo agrega o quita su nombre. (Útil cuando hay 2 máquinas del mismo producto.)</p>
        </div>

        {/* Recomendación de la central (sugerencia) */}
        {notasRec.length > 0 && (
          <details className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <summary className="cursor-pointer text-xs font-extrabold text-amber-700">💡 {notasRec.length} recomendación{notasRec.length === 1 ? "" : "es"} (no obligatorio) ▾</summary>
            <ul className="mt-1 space-y-0.5">{notasRec.map((n, i) => <li key={i} className="text-sm font-semibold text-amber-900">• {n}</li>)}</ul>
          </details>
        )}

        {/* Cuántos y de qué (por voz) */}
        <div>
          <p className="mb-1.5 text-sm font-bold text-slate-700">¿Cuánto hicieron hoy? Por sabor — <span className="font-semibold text-slate-500">escribe o dicta</span></p>
          {soportado && (
            <button type="button" onClick={escuchar} disabled={escuchando}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold text-white"
              style={{ background: escuchando ? "#ef4444" : accent }}>
              🎙️ {escuchando ? "Escuchando… habla" : "Dictar (ej: “treinta frutilla, veinte pistacho”)"}
            </button>
          )}
          <datalist id={`sabores-${linea}`}>{saboresTipo.map((s) => <option key={s} value={s} />)}</datalist>
          <div className="space-y-2">
            {filas.map((f) => (
              <div key={f.key} className="flex items-center gap-2">
                <input value={f.nombre} onChange={(e) => setFila(f.key, { nombre: e.target.value })} list={`sabores-${linea}`} placeholder="Sabor (elige o escribe)"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800" />
                <input value={f.cantidad} onChange={(e) => setFila(f.key, { cantidad: e.target.value })} inputMode="numeric" placeholder="Cant."
                  className="w-20 rounded-lg border border-slate-300 px-2 py-2.5 text-right text-sm font-semibold" />
                <button type="button" onClick={() => delFila(f.key)} aria-label="Quitar" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base font-bold text-red-500 active:bg-red-50">✕</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addFila} className="mt-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 active:bg-slate-200">+ Otro sabor</button>
        </div>

        {/* Litros (solo moldeo/mezcla) */}
        {(cfg?.litros ?? true) && (
          <label className="block text-sm font-bold text-slate-700">Litros de mezcla {esNuevo ? "(opcional)" : ""}
            <input value={litros} onChange={(e) => setLitros(e.target.value)} inputMode="decimal" placeholder="Ej: 53"
              className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2.5 text-base" />
          </label>
        )}
        {/* Overrun (solo cremas/cassatas) */}
        {cfg?.overrun && (
          <label className="block text-sm font-bold text-slate-700">Overrun / batido (%) <span className="font-normal text-slate-400">(opcional)</span>
            <input value={overrun} onChange={(e) => setOverrun(e.target.value)} inputMode="decimal" placeholder="Ej: 35"
              className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2.5 text-base" />
          </label>
        )}

        {/* El valor/pago por unidad NO se muestra aquí: se calcula en la central
            (panel) para que no todos vean cuánto ganó cada uno. */}

        {/* Anotar algo que faltó (queda como nota para la central) */}
        <label className="block text-sm font-bold text-slate-700">📝 ¿Faltó algo o cambiaron la receta? (opcional)
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2}
            placeholder="Ej: faltó edulcorante, le agregaron más azúcar…"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
        </label>

        {/* Capacitación del producto (cómo se hace) */}
        {!esNuevo && (
          <Link href={`/produccion/capacitaciones?linea=${encodeURIComponent(linea)}`}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-sm font-bold text-slate-600 active:bg-slate-100">
            🎓 Ver cómo se hace (capacitación)
          </Link>
        )}

        <button disabled={!listo}
          className="w-full rounded-2xl py-4 text-base font-extrabold text-white shadow active:brightness-95 disabled:opacity-40"
          style={{ background: accent }}>
          ✅ Guardar {total > 0 ? `${total} u.` : ""}
        </button>
        <p className="text-center text-[11px] text-slate-400">Queda guardado con el nombre de quién lo produjo, el producto y la hora. Luego toca ← Volver para el siguiente.</p>
      </div>
    </form>
  );
}
