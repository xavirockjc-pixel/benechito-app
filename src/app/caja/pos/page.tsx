import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { MEDIOS_PAGO, medioPagoLabel } from "@/lib/dominio/ventas";
import { sesionAbierta } from "../actions";
import { abrirCajaPOS, venderCajaPOS, cerrarCajaPOS } from "./actions";
import { POS_CSS } from "./estilos";

// Siempre datos frescos: al recargar tras vender/abrir/cerrar se ven stock y totales al día.
export const dynamic = "force-dynamic";

/*
  BENECHITO — Caja POS (versión ligera y compatible)
  --------------------------------------------------
  Pensada para el terminal TUU/SUNMI (Android 11 + Chrome 56), donde el /caja normal
  aparece "sin estilos" porque:
    1) Tailwind v4 envuelve TODAS las utilidades en @layer (reglas de cascada) que
       Chrome 56 no entiende, así que descarta el bloque completo -> sin estilos.
    2) La paleta de Tailwind v4 usa oklch() / color-mix() / @property, no soportados.
    3) El bundle de Next 16 + React 19 usa sintaxis moderna (?. y ??) que Chrome 56
       no puede ejecutar -> React no hidrata -> botones muertos.

  Esta página NO usa clases de Tailwind ni hidratación de React:
    - CSS propio en <style> (hex plano + flexbox, sin grid, sin oklch, sin @layer).
    - Interactividad con un <script> en JS clásico (sin ?. ni ??), no depende del bundle.
    - Se envía la venta con un <form> nativo (POST) a un Server Action reutilizado, que
      funciona por mejora progresiva aunque React no hidrate.
    - Un contenedor position:fixed cubre toda la pantalla, tapando la cabecera heredada.
*/

type ProdPOS = {
  id: string;
  nombre: string;
  formato: string | null;
  linea: string;
  precios: Record<string, number>;
  stock: number;
};

export default async function CajaPOSPage() {
  const sesion = await sesionAbierta();

  // ----- Sin caja abierta: pantalla de APERTURA -----
  if (!sesion) {
    return (
      <div className="posx-root">
        <StyleTag />
        <div className="posx-abrir">
          <div className="posx-abrir-card">
            <div className="posx-logo">B</div>
            <h1>Abrir caja</h1>
            <p>¿Con cuánto efectivo de cambio partes hoy?</p>
            <form action={abrirCajaPOS}>
              <label className="posx-lbl" htmlFor="fondo">Efectivo de cambio</label>
              <div className="posx-money">
                <span>$</span>
                <input id="fondo" name="fondo" type="number" inputMode="numeric" min="0" step="1" defaultValue="0" />
              </div>
              <button type="submit" className="posx-btn-primary">Abrir caja</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ----- Caja abierta: cargar productos, precios, stock y totales (mismo backend) -----
  const salaUbic =
    (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } })) ??
    (await prisma.ubicacion.findFirst());

  const [listas, prods, precios, stockSala, ventas] = await Promise.all([
    prisma.listaPrecio.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.precioProducto.findMany({ where: { cantidadMinima: 1 } }),
    salaUbic ? prisma.stock.findMany({ where: { ubicacionId: salaUbic.id } }) : Promise.resolve([]),
    prisma.venta.findMany({ where: { sesionCajaId: sesion.id }, include: { pagos: true } }),
  ]);

  const preciosDe: Record<string, Record<string, number>> = {};
  for (const p of precios) {
    (preciosDe[p.productoId] ??= {})[p.listaId] = Number(p.precio);
  }
  const stockDe = new Map(stockSala.map((s) => [s.productoId, s.cantidad]));

  const productos: ProdPOS[] = prods.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    formato: p.formato,
    linea: p.linea || "Otros",
    precios: preciosDe[p.id] ?? {},
    stock: stockDe.get(p.id) ?? 0,
  }));

  const listaSalaId = listas.find((l) => l.canal === "sala")?.id ?? listas[0]?.id ?? "";

  // Categorías (por línea de producto) para las pestañas.
  const categorias = Array.from(new Set(productos.map((p) => p.linea))).sort((a, b) =>
    a.localeCompare(b, "es"),
  );

  const totalVendido = ventas.reduce((s, v) => s + Number(v.total), 0);
  const nVentas = ventas.length;

  // Datos para el script (JSON embebido, escapado para no romper </script>).
  const payload = {
    productos: productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      formato: p.formato || "",
      linea: p.linea,
      precios: p.precios,
      stock: p.stock,
    })),
    listaInicial: listaSalaId,
  };
  const payloadJSON = JSON.stringify(payload).replace(/</g, "\\u003c");

  const precioInicial = (p: ProdPOS) => p.precios[listaSalaId] ?? 0;

  return (
    <div className="posx-root">
      <StyleTag />

      {/* Cabecera con totales de la sesión */}
      <header className="posx-head">
        <div className="posx-head-brand">
          <span className="posx-logo posx-logo-sm">B</span>
          <span className="posx-title">Benechito Caja</span>
        </div>
        <div className="posx-stats">
          <div className="posx-stat"><b>{fmtCLP(totalVendido)}</b><span>Vendido</span></div>
          <div className="posx-stat"><b>{nVentas}</b><span>Ventas</span></div>
          <div className="posx-stat"><b>{fmtCLP(Number(sesion.fondoInicial))}</b><span>Fondo</span></div>
        </div>
        <button type="button" className="posx-close-btn" id="posxAbrirCierre">Cerrar caja</button>
      </header>

      {/* Navegación entre pantallas del POS */}
      <nav className="posx-nav">
        <a href="/caja/pos" className="posx-nav-on">🛒 Vender</a>
        <a href="/caja/pos/nuevo">➕ Producto</a>
        <a href="/caja/pos/vecina">🏧 Caja Vecina</a>
      </nav>

      {/* Selector de lista de precios (tipo de comprador) + buscador */}
      <div className="posx-tools">
        {listas.length > 1 && (
          <select id="posxLista" className="posx-select" defaultValue={listaSalaId}>
            {listas.map((l) => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        )}
        <input id="posxBuscar" className="posx-buscar" type="text" placeholder="Buscar producto…" autoComplete="off" />
      </div>

      {/* Pestañas de categorías */}
      <div className="posx-cats" id="posxCats">
        <button type="button" className="posx-cat posx-cat-on" data-linea="__all__">Todos</button>
        {categorias.map((c) => (
          <button type="button" key={c} className="posx-cat" data-linea={c}>{c}</button>
        ))}
      </div>

      {/* Rejilla de productos (botones grandes) */}
      <div className="posx-prods" id="posxProds">
        {productos.map((p) => (
          <button
            type="button"
            key={p.id}
            className="posx-pbtn"
            data-id={p.id}
            data-linea={p.linea}
            data-buscar={p.nombre.toLowerCase()}
            data-precio={precioInicial(p)}
          >
            <span className="posx-pnom">{p.nombre}</span>
            <span className="posx-pmeta">{[p.formato, `stock ${p.stock}`].filter(Boolean).join(" · ")}</span>
            <span className="posx-pprecio">{fmtCLP(precioInicial(p))}</span>
          </button>
        ))}
        {productos.length === 0 && <p className="posx-vacio">No hay productos activos.</p>}
      </div>

      {/* Barra inferior: total + ver venta */}
      <div className="posx-barra" id="posxBarra">
        <div className="posx-barra-info">
          <span className="posx-barra-n" id="posxBarraN">0 ítems</span>
          <span className="posx-barra-total" id="posxBarraTotal">{fmtCLP(0)}</span>
        </div>
        <button type="button" className="posx-btn-ver" id="posxVer">Ver venta</button>
      </div>

      {/* Panel de la venta (carrito) */}
      <div className="posx-overlay" id="posxCarrito">
        <div className="posx-panel">
          <div className="posx-panel-head">
            <h2>Venta</h2>
            <button type="button" className="posx-x" id="posxCerrarCarrito">✕</button>
          </div>
          <div className="posx-lineas" id="posxLineas">
            <p className="posx-vacio">Toca productos para agregarlos.</p>
          </div>
          <div className="posx-desc">
            <label htmlFor="posxDesc">Descuento</label>
            <div className="posx-money posx-money-sm">
              <span>$</span>
              <input id="posxDesc" type="number" inputMode="numeric" min="0" step="1" placeholder="0" />
            </div>
          </div>
          <div className="posx-total-row">
            <span>Total</span>
            <span id="posxTotal">{fmtCLP(0)}</span>
          </div>

          <form action={venderCajaPOS} id="posxForm">
            <input type="hidden" name="items" id="posxItems" defaultValue="[]" />
            <input type="hidden" name="descuento" id="posxDescuentoHidden" defaultValue="0" />
            <label className="posx-lbl" htmlFor="posxMedio">Medio de pago</label>
            <select name="medio" id="posxMedio" className="posx-select posx-select-full" defaultValue="efectivo">
              {MEDIOS_PAGO.filter((m) => m !== "credito").map((m) => (
                <option key={m} value={m}>{medioPagoLabel[m]}</option>
              ))}
            </select>
            <button type="submit" className="posx-btn-primary posx-btn-cobrar" id="posxCobrar" disabled>
              Cobrar
            </button>
          </form>
          <button type="button" className="posx-btn-vaciar" id="posxVaciar">Vaciar venta</button>
        </div>
      </div>

      {/* Panel de cierre de caja */}
      <div className="posx-overlay" id="posxCierre">
        <div className="posx-panel posx-panel-sm">
          <div className="posx-panel-head">
            <h2>Cerrar caja</h2>
            <button type="button" className="posx-x" id="posxCerrarCierre">✕</button>
          </div>
          <form action={cerrarCajaPOS}>
            <label className="posx-lbl" htmlFor="efectivoContado">Efectivo contado en el cajón</label>
            <div className="posx-money">
              <span>$</span>
              <input id="efectivoContado" name="efectivoContado" type="number" inputMode="numeric" min="0" step="1" defaultValue="0" />
            </div>
            <label className="posx-lbl" htmlFor="notas">Notas (opcional)</label>
            <textarea id="notas" name="notas" className="posx-textarea" rows={2} placeholder="Observaciones del cierre…" />
            <button type="submit" className="posx-btn-primary posx-btn-danger">Cerrar caja del día</button>
          </form>
        </div>
      </div>

      <script id="posx-data" type="application/json" dangerouslySetInnerHTML={{ __html: payloadJSON }} />
      <script dangerouslySetInnerHTML={{ __html: POS_SCRIPT }} />
    </div>
  );
}

/* ------------------------- CSS autocontenido (Chrome 56 OK) ------------------------- */
function StyleTag() {
  return <style dangerouslySetInnerHTML={{ __html: POS_CSS }} />;
}


/* ---------------------- JS clásico (sin ?. ni ??) para Chrome 56 --------------------- */
const POS_SCRIPT = `
(function(){
  var dataEl = document.getElementById('posx-data');
  if(!dataEl){ return; }
  var data;
  try { data = JSON.parse(dataEl.textContent || dataEl.innerHTML); } catch(e){ return; }
  var productos = data.productos || [];
  var listaId = data.listaInicial || '';

  var byId = {};
  for (var i=0;i<productos.length;i++){ byId[productos[i].id] = productos[i]; }

  var cart = {}; // id -> { id: , cantidad: , precioUnit: }

  function fmt(n){
    n = Math.round(Number(n)||0);
    var neg = n < 0; var s = String(Math.abs(n)); var out = '';
    while (s.length > 3){ out = '.' + s.slice(s.length-3) + out; s = s.slice(0, s.length-3); }
    out = s + out;
    return (neg ? '-$' : '$') + out;
  }
  function norm(s){
    s = (s||'').toLowerCase();
    if (s.normalize){ try { s = s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, ''); } catch(e){} }
    return s;
  }
  function precioDe(p){
    var m = p.precios || {};
    var v = m[listaId];
    return (v === undefined || v === null) ? 0 : Number(v);
  }
  function cartKeys(){ return Object.keys(cart); }

  // --- Refrescar precios visibles al cambiar de lista ---
  function refreshPrecios(){
    var btns = document.getElementsByClassName('posx-pbtn');
    for (var i=0;i<btns.length;i++){
      var b = btns[i];
      var p = byId[b.getAttribute('data-id')];
      if(!p) continue;
      var pr = precioDe(p);
      b.setAttribute('data-precio', pr);
      var el = b.getElementsByClassName('posx-pprecio')[0];
      if(el){ el.textContent = fmt(pr); }
    }
  }

  function addItem(id, n){
    var p = byId[id];
    if(!p){ return; }
    var cur = cart[id];
    var cant = (cur ? cur.cantidad : 0) + n;
    if (cant <= 0){ delete cart[id]; }
    else { cart[id] = { id: id, cantidad: cant, precioUnit: cur ? cur.precioUnit : precioDe(p) }; }
    renderCart();
  }
  function quitar(id){ delete cart[id]; renderCart(); }
  function vaciar(){ cart = {}; renderCart(); }

  function totales(){
    var keys = cartKeys(); var sub = 0; var n = 0;
    for (var i=0;i<keys.length;i++){ var l = cart[keys[i]]; sub += l.precioUnit * l.cantidad; n += l.cantidad; }
    var descEl = document.getElementById('posxDesc');
    var desc = descEl ? (Number(descEl.value)||0) : 0;
    if (desc < 0) desc = 0; if (desc > sub) desc = sub;
    return { sub: sub, desc: desc, total: sub - desc, n: n };
  }

  function renderCart(){
    var cont = document.getElementById('posxLineas');
    var keys = cartKeys();
    if (keys.length === 0){
      cont.innerHTML = '<p class="posx-vacio">Toca productos para agregarlos.</p>';
    } else {
      var html = '';
      for (var i=0;i<keys.length;i++){
        var l = cart[keys[i]];
        var p = byId[l.id];
        var nom = p ? p.nombre : '';
        html += '<div class="posx-linea" data-id="'+l.id+'">'
          + '<div class="posx-linea-top"><span class="posx-linea-nom"></span>'
          + '<span class="posx-linea-sub">'+fmt(l.precioUnit*l.cantidad)+'</span></div>'
          + '<div class="posx-linea-ctrl">'
          + '<button type="button" class="posx-qbtn" data-act="menos" data-id="'+l.id+'">\\u2212</button>'
          + '<span class="posx-qnum">'+l.cantidad+'</span>'
          + '<button type="button" class="posx-qbtn" data-act="mas" data-id="'+l.id+'">+</button>'
          + '<button type="button" class="posx-linea-quitar" data-act="quitar" data-id="'+l.id+'">Quitar</button>'
          + '</div></div>';
      }
      cont.innerHTML = html;
      // Poner nombres como texto (evita inyección desde el nombre del producto).
      var noms = cont.getElementsByClassName('posx-linea-nom');
      var j = 0;
      for (var k=0;k<keys.length;k++){ var pp = byId[keys[k]]; if(noms[j]){ noms[j].textContent = pp ? pp.nombre : ''; } j++; }
    }

    var t = totales();
    document.getElementById('posxTotal').textContent = fmt(t.total);
    document.getElementById('posxBarraTotal').textContent = fmt(t.total);
    document.getElementById('posxBarraN').textContent = t.n + (t.n === 1 ? ' ítem' : ' ítems');
    document.getElementById('posxItems').value = JSON.stringify(itemsParaEnviar());
    document.getElementById('posxDescuentoHidden').value = String(t.desc);
    var cobrar = document.getElementById('posxCobrar');
    if (t.n === 0){ cobrar.setAttribute('disabled','disabled'); cobrar.textContent = 'Cobrar'; }
    else { cobrar.removeAttribute('disabled'); cobrar.textContent = 'Cobrar ' + fmt(t.total); }
  }

  function itemsParaEnviar(){
    var keys = cartKeys(); var arr = [];
    for (var i=0;i<keys.length;i++){ var l = cart[keys[i]]; arr.push({ productoId: l.id, cantidad: l.cantidad, precioUnit: l.precioUnit }); }
    return arr;
  }

  // --- Categorías ---
  function filtrar(){
    var catOn = document.querySelector('.posx-cat-on');
    var linea = catOn ? catOn.getAttribute('data-linea') : '__all__';
    var q = norm((document.getElementById('posxBuscar')||{}).value || '');
    var btns = document.getElementsByClassName('posx-pbtn');
    for (var i=0;i<btns.length;i++){
      var b = btns[i];
      var okCat = (linea === '__all__') || (b.getAttribute('data-linea') === linea);
      var okQ = (q === '') || (norm(b.getAttribute('data-buscar')).indexOf(q) !== -1);
      b.style.display = (okCat && okQ) ? '' : 'none';
    }
  }

  // --- Overlays ---
  function abrir(id){ var el = document.getElementById(id); if(el){ el.className = 'posx-overlay posx-open'; } }
  function cerrar(id){ var el = document.getElementById(id); if(el){ el.className = 'posx-overlay'; } }

  // ===== Eventos =====
  // Click en producto
  var prodsCont = document.getElementById('posxProds');
  if (prodsCont){
    prodsCont.addEventListener('click', function(ev){
      var t = ev.target;
      while (t && t !== prodsCont && (!t.className || String(t.className).indexOf('posx-pbtn') === -1)){ t = t.parentNode; }
      if (t && t.getAttribute){ var id = t.getAttribute('data-id'); if(id){ addItem(id, 1); } }
    });
  }

  // Click en categoría
  var catsCont = document.getElementById('posxCats');
  if (catsCont){
    catsCont.addEventListener('click', function(ev){
      var t = ev.target;
      if (t && t.getAttribute && t.getAttribute('data-linea') !== null){
        var all = catsCont.getElementsByClassName('posx-cat');
        for (var i=0;i<all.length;i++){ all[i].className = 'posx-cat'; }
        t.className = 'posx-cat posx-cat-on';
        filtrar();
      }
    });
  }

  // Buscar
  var buscar = document.getElementById('posxBuscar');
  if (buscar){ buscar.addEventListener('input', filtrar); buscar.addEventListener('keyup', filtrar); }

  // Lista de precios
  var selLista = document.getElementById('posxLista');
  if (selLista){ selLista.addEventListener('change', function(){ listaId = selLista.value; refreshPrecios(); }); }

  // Carrito: +/- / quitar
  var lineasCont = document.getElementById('posxLineas');
  if (lineasCont){
    lineasCont.addEventListener('click', function(ev){
      var t = ev.target; var act = t && t.getAttribute ? t.getAttribute('data-act') : null;
      if(!act){ return; }
      var id = t.getAttribute('data-id');
      if (act === 'mas'){ addItem(id, 1); }
      else if (act === 'menos'){ addItem(id, -1); }
      else if (act === 'quitar'){ quitar(id); }
    });
  }

  // Descuento -> recalcular
  var descEl = document.getElementById('posxDesc');
  if (descEl){ descEl.addEventListener('input', renderCart); descEl.addEventListener('keyup', renderCart); }

  // Botones de overlays
  var verBtn = document.getElementById('posxVer');
  if (verBtn){ verBtn.addEventListener('click', function(){ abrir('posxCarrito'); }); }
  var barra = document.getElementById('posxBarra');
  if (barra){ barra.addEventListener('click', function(ev){ if (ev.target === barra || (ev.target && String(ev.target.className).indexOf('posx-barra-info')!==-1) || (ev.target && ev.target.parentNode===barra)) { abrir('posxCarrito'); } }); }
  var cerrarCarrito = document.getElementById('posxCerrarCarrito');
  if (cerrarCarrito){ cerrarCarrito.addEventListener('click', function(){ cerrar('posxCarrito'); }); }
  var vaciarBtn = document.getElementById('posxVaciar');
  if (vaciarBtn){ vaciarBtn.addEventListener('click', vaciar); }

  var abrirCierre = document.getElementById('posxAbrirCierre');
  if (abrirCierre){ abrirCierre.addEventListener('click', function(){ abrir('posxCierre'); }); }
  var cerrarCierre = document.getElementById('posxCerrarCierre');
  if (cerrarCierre){ cerrarCierre.addEventListener('click', function(){ cerrar('posxCierre'); }); }

  // Al enviar la venta: asegurar datos actualizados en los hidden.
  var form = document.getElementById('posxForm');
  if (form){
    form.addEventListener('submit', function(ev){
      var t = totales();
      if (t.n === 0){ ev.preventDefault(); return; }
      document.getElementById('posxItems').value = JSON.stringify(itemsParaEnviar());
      document.getElementById('posxDescuentoHidden').value = String(t.desc);
    });
  }

  renderCart();
})();
`;
