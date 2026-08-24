# 🍫 Ecosistema Benechito — Documento maestro

> Sistema de gestión comercial completo para una fábrica de dulces/helados artesanales
> (trufas, cuchuflíes, helados, postres) con venta en terreno, sala, distribución y delivery.
> Un solo sistema, cinco apps por rol, control por voz y automatización con WhatsApp.

---

## 1. Qué es y para quién

Benechito es un **ecosistema operativo** que conecta toda la cadena: **producción → bodega →
armado de surtidos → carga a camión/local → venta → reposición → cobranza**, más la captación
de pedidos por redes y su despacho.

Está pensado para un equipo **no técnico** que trabaja desde **el teléfono (Android)**, con
botones grandes, control por **voz en español (es-CL)** y **privacidad por rol** (cada operario
ve solo lo suyo; los totales y el dinero solo en la central).

**Roles / usuarios:**
| Rol | App | Para quién |
|---|---|---|
| propietario / admin | **Central** (`/admin`) | Dueño / administración |
| vendedor | **Vendedor** (`/vendedor`) | Vendedores en ruta |
| caja | **Local / Caja** (`/caja`) | Cajero de sala |
| bodega | **Bodega** (`/bodega`) | Bodeguero |
| produccion | **Producción** (`/produccion`) | Fabricante / operario |

Todos entran por `/login` con su correo `@benechito.com`; el sistema los envía solo a su app.

---

## 2. Stack técnico e infraestructura

- **Framework:** Next.js 16 (App Router, Server Actions, `output: standalone`), React 19.
- **Estilos:** Tailwind CSS v4. Mobile-first, PWA (un webmanifest por app + service worker en prod).
- **Datos:** PostgreSQL + Prisma ORM (migraciones versionadas).
- **Auth:** JWT con `jose`, verificado en el borde por middleware (`proxy.ts`) + RBAC por rol
  (`homeDe(rol)`, guardas por ruta, matcher para `/admin`, `/vendedor`, `/caja`, `/bodega`, `/produccion`).
- **Voz:** Web Speech API (`SpeechRecognition`, es-CL). Parser propio por reglas (números en
  palabras, unidades, fechas, coincidencia de productos/sabores). **Sin costo de IA.**
- **Automatización / WhatsApp:** n8n + Evolution API. Webhook entrante para pedidos de retiro.
- **Infra:** VPS Hostinger (Ubuntu 24.04) + EasyPanel (Docker Swarm). Publicar = EasyPanel →
  servicio `web` → **"Implementar"** (aplica migraciones solo). `npm run seed` solo al crear usuarios.

---

## 3. Arquitectura del ecosistema (flujo real)

```
                 ┌─────────────────────────────────────────────┐
                 │                  CENTRAL                      │
                 │  Panel, Tablero, Agenda, POS, Clientes,       │
                 │  Precios, Pedidos, Preventa, Retiros, Rutas,  │
                 │  Ventas, Inventario, Reposiciones, Producción,│
                 │  Materias primas, Sabores, Finanzas, Usuarios │
                 └───────┬───────────────┬───────────────┬───────┘
                         │               │               │
        ┌────────────────┘        ┌──────┘        ┌───────┘
        ▼                         ▼               ▼
  ┌───────────┐            ┌────────────┐   ┌───────────┐
  │ PRODUCCIÓN│  fabrica → │   BODEGA   │ → │  LOCAL    │  ← venta en sala
  │ (fábrica) │  sabores/  │ stock +    │   │  (caja)   │
  └───────────┘  productos │ surtidos   │   └───────────┘
        │                  │ (mezclas)  │
        │ consume          └─────┬──────┘
        ▼ materias primas        │ carga camión
  ┌───────────┐                  ▼
  │  MATERIAS │            ┌───────────┐
  │  PRIMAS   │            │ VENDEDOR  │ → venta en terreno / reposición
  │ (recetas) │            │ (ruta)    │    agenda de visitas / entregas
  └───────────┘            └───────────┘

  Pedidos externos (WhatsApp / Facebook / Instagram)
        └──► CENTRAL (Retiros) ──► despacha a Local / Bodega / Reparto
```

**Flujo de mercadería:** Producción fabrica por **tipo (línea) + sabor** → entra al **StockSabor
de bodega** → el bodeguero **arma surtidos/mixtos** (saca bolsas de 50 de cámara y mezcla) → se
**carga al camión** o al **local** → se **vende** → se **repone** en los puntos.

**Flujo de dinero:** cada venta genera un hecho económico (`Venta`) con estado de pago
(pendiente / parcial / pagado). Se aceptan **abonos** (paga una parte, queda debiendo), **crédito**
(fiado) y **deuda directa** (saldo anterior). La cobranza se hace por abonos.

---

## 4. Las apps en detalle

### 4.1 Central / Administración (`/admin`) — propietario/admin
El "cerebro". Módulos:
- **Panel** y **Tablero (Dashboard):** KPIs por período (hoy/semana/mes/histórico), ventas,
  fabricación, bodega, entregas, gráfico de 14 días.
- **Agenda:** calendario mensual; agendar apartar / mezclar / fabricar / entrega; "mandar a fabricar"
  crea una orden de producción.
- **Asistente de voz (`/admin/voz`):** por comandos. Crea órdenes de producción y agenda, y
  **navega por voz a cualquier módulo** ("abre precios", "ve a inventario").
- **Punto de venta (POS):** venta directa; elige cliente (buscador) para dejar **abono** o **crédito**;
  sin cliente = mostrador al contado. Descuenta stock de sala.
- **Clientes (Negocios):** ficha con cuenta corriente (vendido/pagado/saldo), clasificación
  comercial (lista de precios), reposiciones, notas, y **registrar deuda directa**.
- **Catálogo (Productos), Precios** (por lista/canal: distribuidor, revendedor, mayorista, negocio,
  consumidor…), **Pedidos**.
- **Preventa:** campañas por WhatsApp (n8n + Evolution) antes de la ruta + panel de **reservas y
  visitas de terreno** agendadas por los vendedores.
- **Retiros:** captura/despacho de pedidos que entran por WhatsApp/Facebook/Instagram (ver §7).
- **Rutas:** planificación y ejecución de la ruta del vendedor.
- **Ventas:** listado; **eliminar/deshacer venta** repone el stock (para pruebas/errores).
- **Inventario, Reposiciones.**
- **Producción:** órdenes de producción. **Materias primas** (ver §6). **Sabores.**
- **Finanzas:** gastos/egresos, flujo de caja.
- **Usuarios.**

### 4.2 Vendedor (`/vendedor`) — vendedor/chofer
App PWA para la ruta. Barra inferior: **Clientes · Agenda · Ruta · Camión · Nuevo**.
- **Clientes:** buscador; cada ficha muestra saldo (deuda), WhatsApp, "cómo llegar" (GPS),
  y acciones grandes: **Vender, Cobrar, Resultado, Reponer**.
- **Vender (en terreno):** carrito con **voz** ("dos frutilla, tres surtido"), botón vaciar.
  Pago: efectivo, transferencia, **abono** (paga una parte, queda debiendo el resto) o **crédito**.
- **Cobrar:** abonos a deudas pendientes.
- **Reponer:** reposición por sabor de un punto (descuenta de la caja del camión).
- **Registrar deuda** directa (saldo anterior).
- **Venta rápida** (sin cliente, a público).
- **Agenda:** agendar **entrega** (hoy/mañana), **próxima visita con fecha + reserva**, o **pedido
  exprés (delivery)**. Contacto por WhatsApp, flujo **por confirmar → cargado → entregado**.
  También recibe los **retiros despachados a Reparto**. Las visitas/reservas se ven en la Preventa central.
- **Camión:** cargar productos y sabores desde bodega (con voz), devolver todo a bodega.
- **Nuevo cliente:** captación en ruta con ubicación GPS (o pegando link/coordenadas de Maps).
- **Ubicación manual:** además de GPS, se puede pegar coordenadas o link de Google Maps.

### 4.3 Local / Caja (`/caja`) — caja
- **Abrir caja** (fondo inicial) → **POS** de sala.
- POS con **buscador + voz**, selector de **tipo de cliente** (respeta canal de precios),
  precio unitario y cantidad editables, descuentos.
- **Distribución:** recibir productos de distribución (bebidas/snacks) por tipo + sabor,
  con registro del día (sin totales).
- **Cierre de caja** (cuadre).
- Recibe los **retiros despachados a Local**.

### 4.4 Bodega (`/bodega`) — bodega
Barra inferior: **Bodega · Surtidos · Insumos**.
- **Bodega:** entró/salió + **stock actual** + **registro del día**, con **voz** (agregar/quitar)
  y botones manuales.
- **Surtidos:** el bodeguero **saca bolsas (×50) de sabores de cámara** y los **mezcla en
  mixtos/surtidos** (el registro muestra solo cuántos mixtos, no el detalle por sabor).
- **Insumos (materias primas):** ve **lo que queda**, **ingresa** y **saca** insumos, **crea**
  insumos nuevos (incluso **por voz**: "ingresa 5 kilos de chocolate"), y ve el **registro de
  movimientos**. No ve costos ni valorización.
- Recibe los **retiros despachados a Bodega**.

### 4.5 Producción (`/produccion`) — produccion (app separada de bodega)
Barra inferior: **Producción · Insumos**.
- **Producción:** órdenes de producción pendientes (cumplir con cantidad real + merma → ingresa a
  bodega), producción libre (sin orden), reporte de turno. **Buscador + voz + deshacer.**
- Al fabricar, **descuenta materias primas por receta** automáticamente.
- **Insumos:** consumo manual de materias primas (para lo que no está en receta). Solo registro del
  día; no ve totales ni costos.

---

## 5. Voz (control por dictado)

- Tecnología: Web Speech API (es-CL), sin costo.
- Operarios: agregar/quitar productos y sabores dictando, con botón **deshacer/vaciar**.
- Bodega insumos: dictar ingreso/creación de insumo (número + unidad + nombre).
- Central: asistente por **comandos** que crea órdenes/agenda y **navega a cualquier módulo**.
- Siempre se puede **corregir el texto y la cantidad antes de confirmar** (nunca guarda a ciegas).

---

## 6. Materias primas, materiales y recetas

- **MateriaPrima:** insumo (chocolate, azúcar…) o material/envase (cajas, envoltorios), con unidad
  (kg, g, L, ml, unidad), stock, **stock mínimo (alerta de stock bajo)** y **costo por unidad**.
- **Movimientos:** entrada, salida, consumo, merma, ajuste (auditables, con usuario).
- **Recetas (RecetaItem):** cuánto insumo lleva **una unidad** de un producto o sabor. Al fabricar N,
  se descuenta cantidad × N **automáticamente**. Si no hay receta, se consume a mano.
- **Privacidad:** operarios registran (bodega ingresa/saca, producción consume) y ven cantidades y
  su registro; **los costos, el valor de inventario y las recetas solo se ven en la central.**

---

## 7. Automatización y WhatsApp

- **Preventa:** envío masivo de WhatsApp antes de la ruta vía n8n + Evolution (`N8N_PREVENTA_WEBHOOK_URL`).
- **Buzón automático de retiros:** endpoint `POST /api/retiros/entrante` (autenticado con
  `RETIROS_WEBHOOK_TOKEN`). Cuando un cliente escribe por **WhatsApp/Facebook/Instagram**, n8n
  llama a este webhook y el pedido **cae solo en la central**; se **calza automáticamente** con el
  cliente por teléfono. Desde la central se **despacha a Local, Bodega o Reparto**, y a ese
  departamento le aparece en su app + aviso al cliente por WhatsApp.
- **Nuevos leads:** la landing crea prospectos (`/api/prospectos`) con gancho a n8n.

---

## 8. Reglas de privacidad por rol (criterio del negocio)

- Los **operarios NO ven** totales acumulados, producción del mes ni ventas del mes.
- **Bodeguero SÍ ve** el stock actual de bodega y de insumos, y sus movimientos (para trabajar),
  pero **no los costos ni el valor en dinero**.
- El **detalle por sabor de los mixtos** solo se ve en el panel (el bodeguero ve solo cuántos mixtos).
- **Totales, costos y finanzas: solo en la central.**

---

## 9. Modelo de datos (entidades clave)

`Negocio` (cliente/CRM) · `Producto` · `Sabor` · `Ubicacion` (bodega/sala/vehículo) ·
`Stock` / `StockSabor` · `MovimientoStock` · `ListaPrecio` / `PrecioProducto` ·
`Pedido` / `PedidoItem` · `Venta` / `Pago` (estado de pago: pendiente/parcial/pagado) ·
`Reposicion` / `ReposicionItem` · `OrdenProduccion` · `Ruta` / `ParadaRuta` ·
`Agenda` (apartar/mezclar/fabricar/entrega/express/visita/retiro; con destino y canal para retiros) ·
`MovimientoBodega` (registro diario de bodega/local/producción) ·
`MateriaPrima` / `MovimientoMateria` / `RecetaItem` ·
`Gasto` · `SesionCaja` / `MovimientoCaja` · `Preventa` · `Actividad` · `Auditoria` · `Usuario`.

---

## 10. Estado y pendientes (roadmap)

**Hecho:** las 5 apps con RBAC y voz; flujo completo mercadería/dinero; agenda de visitas y
entregas; retiros con buzón automático (n8n); materias primas + recetas con descuento automático;
abono/crédito/deuda directa; tablero, dashboard, eliminar ventas con reposición.

**Pendiente / siguiente:**
- Auto-despacho de retiros por palabras clave (delivery → Reparto).
- Aviso automático al departamento por WhatsApp cuando le cae un retiro.
- Alerta de **stock bajo de insumos por WhatsApp**.
- Fecha de vencimiento de deudas (marcar atrasados).
- Asistente de voz con IA (modificar todo hablando) — con costo por comando.
- Cambiar las contraseñas por defecto (`benechito123`) por una por persona.

---

## 11. Prompt maestro reutilizable

> Úsalo para explicarle el sistema a alguien (o a una IA) en una frase larga:

**"Construye un ecosistema de gestión comercial mobile-first para una fábrica de dulces
artesanales, en Next.js + Prisma + PostgreSQL, con cinco apps por rol (central/admin, vendedor,
caja, bodega, producción) unidas por login con JWT y control de acceso por rol. Debe cubrir el
flujo completo producción → bodega → surtidos → camión/local → venta → reposición → cobranza,
con control por voz en español para operarios, privacidad por rol (los operarios ven solo su
registro diario y stock, nunca totales, costos ni ventas del mes), inventario de materias primas
con recetas que se descuentan solas al fabricar, ventas con abono/crédito/deuda, agenda de visitas
y entregas, y captación de pedidos por WhatsApp/Facebook/Instagram que caen en la central vía
webhook (n8n + Evolution) y se despachan a local, bodega o reparto."**

---

*Documento generado como referencia del ecosistema Benechito. Mantener actualizado al agregar módulos.*
