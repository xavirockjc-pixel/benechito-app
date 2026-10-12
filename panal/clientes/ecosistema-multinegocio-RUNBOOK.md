# 🏗️ Runbook — Ecosistema Multinegocio (4 locales + panadería + heladería)

Pasos desde que **el cliente acepta** hasta que queda **montado y funcionando**.
Reparto de roles: **tú** vendes, cobras y juntas los datos; **Claude** hace todo lo
técnico (crear el proyecto, deploy, carga, respaldo). El cliente solo usa sus apps.

Propuesta de referencia: `panal/clientes/ecosistema-multinegocio.html`
Plan: **$1.200.000** instalación + **$80.000/mes** (Completo a medida).

---

## Paso 0 · El cliente acepta ✅ (lo haces tú)
1. **Confirma el alcance**: ¿3 o 4 locales? ¿Se incluye la tienda online / clientes
   externos de heladería? Deja por escrito qué entra (sirve la lista del Plan).
2. **Cobra el anticipo**: 50% de la instalación ($600.000) para arrancar el montaje.
   El saldo contra entrega. La mensualidad ($80.000) parte el mes siguiente a la entrega.
3. **Acuerda fecha de entrega** (referencia: 5–10 días hábiles desde que tienes los datos).
4. **Avísame a mí (Claude)** que está cerrado, y pásame la ficha del Paso 1.

---

## Paso 1 · Juntar los datos del cliente 📋 (lo haces tú, una sola vez)
Con esto yo armo todo. Pídele al cliente:

**Del grupo**
- Nombre del grupo/dueño, logo (si tiene), colores, WhatsApp, ciudad.

**De cada negocio (×3 o ×4)**
- Nombre del local, dirección, y quién lo atiende (nombre → será su usuario).

**Producción**
- Panadería: qué produce (marraqueta, hallulla, etc.) y a qué locales reparte.
- Heladería: qué produce, y si vende a clientes externos (mayoristas).

**Productos y precios**
- Lista de lo que compra al por mayor y vende (nombre, unidad, precio de venta).
- Si hay **precio distinto por tipo de cliente** (público / mayorista), anótalo.

**Proveedores**
- Nombre de sus proveedores principales y en cuántos días les paga (para los avisos de pago).

**Personas y roles** (quién usa qué app)
- Dueño (ve todo) · encargado de bodega/compras · panadero · heladero · cajero por local · repartidor.

> Formato fácil: una foto de su lista de precios + un audio contándome lo de arriba me sirve.

---

## Paso 2 · Montaje técnico ⚙️ (lo hago yo — Claude)
Cada cliente es un **proyecto independiente** (su repo, su base de datos, su dirección web).
Nada se mezcla con otros clientes.

1. **Crear el proyecto del cliente** desde el molde + su archivo de configuración
   `prisma/clientes/multinegocio.json` con: empresa, los 4 locales (sucursales),
   bodega central, panadería y heladería, listas de precio, catálogo con precios
   y usuarios por rol.
2. **Hosting propio**: un servicio web + un Postgres solo de este cliente.
3. **Instalar y migrar**, luego **cargar sus datos**:
   ```bash
   npm ci && npx prisma migrate deploy && npx prisma generate
   CLIENTE=multinegocio npm run seed:cliente
   ```
4. **Activar lo del ecosistema**: bodega central con traspasos a locales, producción
   (panadería por lote / heladería por litros con descuento de insumos), caja y stock
   por local, panel del dueño con avisos (reponer, pagar, cuadrar) y resumen a su WhatsApp.
5. **Dejar los accesos por rol** con sus claves iniciales.

---

## Paso 3 · Cargar lo real y afinar 🎛️ (yo monto, tú revisas)
1. Entro a la **central** del cliente y cargo productos, precios y fotos reales.
2. Configuro **mínimos de stock** por producto y local (eso dispara los avisos).
3. Cargo **proveedores** y sus plazos de pago (dispara los avisos de pagar).
4. Conecto el **resumen diario** al WhatsApp del dueño.

---

## Paso 4 · Entrega y capacitación 🎓 (juntos)
1. **Prueba en el celular** de cada rol: el cajero vende, baja stock; bodega reparte;
   producción fabrica y descuenta insumos; el dueño ve el panel con sus avisos.
2. **Capacitación corta** (30–45 min): una vuelta por cada app con la persona que la usará.
3. **Cambiar las claves** iniciales por las definitivas del cliente.
4. **Cobra el saldo** (otro 50%) y confirma el inicio de la mensualidad.

---

## Paso 5 · Postventa y respaldo 🔁 (yo mantengo)
- **Respaldo automático** de la base de datos (ver `panal/RESPALDO.md`).
- **Mensualidad**: soporte, hosting y mejoras.
- **Tú actualizas** productos/precios/fotos desde la central, sin tocar código.
- ¿Quiere sumar algo (tienda online, otra sucursal)? Me avisas y lo agrego solo a este cliente.

---

## Quién hace qué (resumen)
| Etapa | Tú (vendes) | Claude (técnico) |
|---|---|---|
| Cierre + anticipo | ✅ | — |
| Juntar datos | ✅ | — |
| Crear proyecto, deploy, carga | — | ✅ |
| Afinar mínimos/proveedores/avisos | revisas | ✅ |
| Capacitar y entregar | ✅ (con el cliente) | ✅ (apoyo) |
| Respaldo y mejoras | pides | ✅ |

> Para empezar el montaje necesito del Paso 1: nombre del grupo, los locales,
> qué produce panadería/heladería, y la lista de productos con precios.
