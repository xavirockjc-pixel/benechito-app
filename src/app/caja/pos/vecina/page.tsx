import { prisma } from "@/lib/prisma";
import { signoCV, cvLabel, cvIcono } from "@/lib/dominio/caja-vecina";
import { eliminarMovCajaVecina } from "../../vecina/actions";
import { POS_CSS } from "../estilos";
import { abrirVecinaPOS, movVecinaPOS, cerrarVecinaPOS } from "../actions";

// Caja Vecina para el POS de la TUU (Chrome viejo): apertura, movimientos y cierre,
// todo con formularios planos (sin voz ni pantallazo). Reutiliza el mismo backend
// (modelo MovimientoCajaVecina) que la Caja Vecina normal → alimenta los mismos dashboards.
export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);
const hora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

// Tipos que el cajero registra a mano (apertura y cierre tienen su propio flujo).
const TIPOS_MOV = ["deposito", "pago", "comision", "giro", "retiro", "ajuste"] as const;

export default async function CajaVecinaPOS() {
  const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
  const movs = await prisma.movimientoCajaVecina.findMany({ where: { fecha: { gte: hoy0 } }, orderBy: { fecha: "desc" } });

  const apertura = movs.find((m) => m.tipo === "apertura");
  const abierta = Boolean(apertura);
  const cerrada = movs.some((m) => m.tipo === "cierre");
  const efectivo = movs.reduce((s, m) => s + signoCV(m.tipo) * num(m.monto), 0);
  const saldoMaquina = apertura ? num(apertura.saldoMaquina) : 0;
  const giros = movs.filter((m) => m.tipo === "giro").reduce((s, m) => s + num(m.monto), 0);
  const paraDepositar = movs.filter((m) => m.tipo === "deposito" || m.tipo === "pago").reduce((s, m) => s + num(m.monto), 0);
  const comision = movs.filter((m) => m.tipo === "comision").reduce((s, m) => s + num(m.monto), 0);

  return (
    <div className="posx-root">
      <style dangerouslySetInnerHTML={{ __html: POS_CSS }} />

      <header className="posx-head">
        <a href="/caja/pos" className="posx-head-back">←</a>
        <div className="posx-head-brand">
          <span className="posx-title">🏧 Caja Vecina</span>
        </div>
      </header>
      <nav className="posx-nav">
        <a href="/caja/pos">🛒 Vender</a>
        <a href="/caja/pos/nuevo">➕ Producto</a>
        <a href="/caja/pos/vecina" className="posx-nav-on">🏧 Caja Vecina</a>
      </nav>

      <div className="posx-sub">
        <div className="posx-sub-inner">
          {/* KPIs */}
          <div className="posx-kpis">
            <Kpi label="Efectivo" valor={CLP(efectivo)} />
            <Kpi label="Máquina" valor={abierta ? CLP(saldoMaquina) : "—"} />
            <Kpi label="Giros" valor={CLP(giros)} />
            <Kpi label="Depositar" valor={CLP(paraDepositar)} />
            <Kpi label="Comisión" valor={CLP(comision)} />
            <Kpi label="Movimientos" valor={String(movs.length)} />
          </div>

          {/* Apertura del día */}
          {!abierta ? (
            <form action={abrirVecinaPOS} className="posx-card">
              <h2>🔓 Abrir Caja Vecina</h2>
              <p className="posx-hint">Con cuánto efectivo y saldo de la máquina partes hoy.</p>
              <label className="posx-lbl" htmlFor="efectivo">Efectivo disponible</label>
              <div className="posx-money"><span>$</span>
                <input id="efectivo" name="efectivo" type="number" inputMode="numeric" min="0" step="1" placeholder="0" />
              </div>
              <label className="posx-lbl" htmlFor="saldoMaquina">Saldo de la máquina</label>
              <div className="posx-money"><span>$</span>
                <input id="saldoMaquina" name="saldoMaquina" type="number" inputMode="numeric" min="0" step="1" placeholder="0" />
              </div>
              <button type="submit" className="posx-btn-primary">Abrir Caja Vecina</button>
            </form>
          ) : (
            <div className="posx-badge">
              <span>🔓 Abierta hoy · Efectivo inicial <b>{CLP(num(apertura!.monto))}</b> · Máquina <b>{CLP(saldoMaquina)}</b></span>
              {cerrada && <b style={{ marginLeft: "auto" }}>🔒 Cerrada</b>}
            </div>
          )}

          {/* Registrar movimiento */}
          {abierta && !cerrada && (
            <form action={movVecinaPOS} className="posx-card">
              <h2>Registrar movimiento</h2>
              <label className="posx-lbl" htmlFor="tipo">Tipo de movimiento</label>
              <select id="tipo" name="tipo" className="posx-input" defaultValue="giro">
                {TIPOS_MOV.map((t) => (
                  <option key={t} value={t}>{cvIcono[t]} {cvLabel[t]}</option>
                ))}
              </select>
              <label className="posx-lbl" htmlFor="monto">Monto</label>
              <div className="posx-money"><span>$</span>
                <input id="monto" name="monto" type="number" inputMode="numeric" min="0" step="1" placeholder="0" />
              </div>
              <label className="posx-lbl" htmlFor="detalle">Detalle (opcional)</label>
              <input id="detalle" name="detalle" className="posx-input" type="text" placeholder="Ej: cuenta de la luz" autoComplete="off" />
              <button type="submit" className="posx-btn-primary">Registrar</button>
            </form>
          )}

          {/* Cierre del día */}
          {abierta && !cerrada && (
            <form action={cerrarVecinaPOS} className="posx-card">
              <h2>🔒 Cerrar Caja Vecina</h2>
              <p className="posx-hint">Cuenta el efectivo real y el saldo final de la máquina.</p>
              <label className="posx-lbl" htmlFor="efectivoContado">Efectivo contado</label>
              <div className="posx-money"><span>$</span>
                <input id="efectivoContado" name="efectivoContado" type="number" inputMode="numeric" min="0" step="1" placeholder="0" />
              </div>
              <label className="posx-lbl" htmlFor="saldoMaquinaFinal">Saldo final de la máquina</label>
              <div className="posx-money"><span>$</span>
                <input id="saldoMaquinaFinal" name="saldoMaquinaFinal" type="number" inputMode="numeric" min="0" step="1" placeholder="0" />
              </div>
              <label className="posx-lbl" htmlFor="notas">Notas (opcional)</label>
              <textarea id="notas" name="notas" className="posx-textarea" rows={2} placeholder="Observaciones…" />
              <button type="submit" className="posx-btn-primary posx-btn-danger">Cerrar caja del día</button>
            </form>
          )}

          {/* Movimientos de hoy */}
          <p className="posx-secc-tit">Movimientos de hoy ({movs.length})</p>
          {movs.length === 0 ? (
            <p className="posx-vacio">Sin movimientos hoy.</p>
          ) : (
            <ul className="posx-movs">
              {movs.map((m) => {
                const entra = signoCV(m.tipo) > 0;
                const neutro = signoCV(m.tipo) === 0;
                return (
                  <li key={m.id} className="posx-mov">
                    <span className="posx-mov-ic">{cvIcono[m.tipo]}</span>
                    <div className="posx-mov-body">
                      <b>{cvLabel[m.tipo]}</b>
                      <span>{hora(m.fecha)}{m.detalle ? ` · ${m.detalle}` : ""}{m.nombreUsuario ? ` · ${m.nombreUsuario}` : ""}</span>
                    </div>
                    {!neutro && (
                      <span className={`posx-mov-monto ${entra ? "posx-mov-mas" : "posx-mov-menos"}`}>
                        {entra ? "+" : "−"}{CLP(num(m.monto))}
                      </span>
                    )}
                    <form action={eliminarMovCajaVecina} style={{ marginLeft: 10 }}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="posx-x" style={{ width: 36, height: 36, fontSize: 14 }}>✕</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="posx-kpi">
      <div className="posx-kpi-in">
        <b>{valor}</b>
        <span>{label}</span>
      </div>
    </div>
  );
}
