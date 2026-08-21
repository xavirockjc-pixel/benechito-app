# Benechito Ecosystem — Documento Técnico de Arquitectura

> **Versión:** 1.0 · **Fecha:** 2026-08-21
> **Basado en:** *Benechito Ecosystem — Documento Maestro v1.0* (visión de negocio)
> **Este documento traduce la visión a decisiones técnicas.** No es la visión; es el *cómo*.
> Cuando la visión y este documento discrepen, gana la visión y se corrige aquí.

Principio rector heredado: **registrar una vez, usar muchas veces.** Fuente única de verdad,
sin duplicar información. Ordenar primero, automatizar después, inteligencia al final.

---

## 0. Decisiones tomadas (registro)

| Decisión | Elección | Motivo | Reversible |
|----------|----------|--------|------------|
| Estructura de sistemas | **Monolito modular** (1 app, 1 BD, módulos lógicos) | Simplicidad, bajo costo, mantenible por el dueño; §37 | Sí — se puede extraer un módulo a servicio propio si el volumen lo exige |
| Base de datos | **PostgreSQL único** (ya en Docker/VPS) | Fuente única, transacciones, ya operativo | Costoso — es el núcleo |
| ORM / esquema | **Prisma**, esquema por dominio en misma BD | Ya en uso, portable | Sí |
| Orquestación | **n8n** (ya en `n8n.benechito.com`) — solo automatiza, no almacena verdad | §33 | Sí |
| WhatsApp | **Evolution API** (ya conectado, `56965813188`) | Stack Imperio Digital | Sí |
| IA | **Desacoplada**: consulta la BD, no es fuente de verdad | §34 | Sí |
| Despliegue | **VPS + EasyPanel + Docker**, dominio `benechito.com` | Ya operativo | Sí |

---

## 1. Estado actual (resumen de auditoría Fase 0)

Lo construido cubre **una esquina de Benechito Comercial**: captación + CRM de Puntos + reposiciones.

**Existe hoy:**
- App Next.js 16 / React 19 / Prisma / Postgres, con landing + panel con login.
- Entidades: `Negocio` (prospecto=cliente), `Producto`, `PuntoProducto`, `Reposicion(+Item)`, `Actividad`, `Usuario`.
- Flujo WhatsApp end-to-end **funcionando**: formulario → Postgres → n8n → Evolution → WhatsApp.
- Infra viva: VPS+EasyPanel, n8n, Evolution, Postgres, Redis, Docker local espejo.

**No existe aún:** catálogo con listas de precios · pedidos · POS/caja · pagos y cuenta corriente ·
preventa/ruta · inventario multiubicación · sistemas Gestión y Técnico · Hub con dashboards calculados.

**Conflictos detectados a resolver en el modelo v2:**
- (A) `Producto` actual no soporta SKU/precio/listas → extender, nunca duplicar producto por canal.
- (B) `Negocio` sin `tipoCliente` estructurado que determine la lista de precios.
- (C) No usar n8n como base de datos.
- (D) "Venta" y "pago" aún no son entidades separadas → diseñarlas distintas desde ya.

---

## 2. Arquitectura general

```
                    ┌───────────────────────────────┐
                    │        BENECHITO HUB          │
                    │  Dashboards CALCULADOS + metas │
                    │  (nunca números manuales, §31) │
                    └───────────────┬───────────────┘
                                    │ lee (solo lectura, agregaciones)
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│  COMERCIAL    │          │   GESTIÓN     │          │   TÉCNICO     │
│ catálogo,CRM, │◀────────▶│ producción,   │◀────────▶│ activos,      │
│ pedidos,POS,  │  eventos │ recetas,compras│  eventos │ mantención,   │
│ pagos,ruta    │          │ calidad,RRHH  │          │ proyectos     │
└───────┬───────┘          └───────┬───────┘          └───────┬───────┘
        │                          │                          │
        └──────────────┬───────────┴──────────────────────────┘
                       ▼
        ┌──────────────────────────────┐        ┌─────────────────┐
        │   PostgreSQL (fuente única)  │◀──────▶│   n8n           │
        │   esquemas: comercial,gestion │  API   │ automatización  │
        │   tecnico, core, hub(views)  │        │ (no almacena)   │
        └──────────────────────────────┘        └────────┬────────┘
                       ▲                                  │
                       │ consulta (nunca inventa)          ▼
                 ┌─────┴──────┐                    ┌──────────────┐
                 │  Agentes IA │                    │ Evolution API │→ WhatsApp
                 └────────────┘                    └──────────────┘
```

**Una sola aplicación Next.js, una sola base Postgres.** Los "3 sistemas" del documento maestro
son **módulos lógicos** dentro de la misma app, no despliegues separados.

> **El sistema de administración vive en su propio espacio `/admin`** (decisión del usuario), con
> **identidad propia** de sistema operativo (tonos slate sobrios, navegación por módulos), separado
> visualmente de la web pública `/` — pero **compartiendo la misma base de datos** (fuente única).
> Al desplegar puede quedar en `benechito.com/admin` o en el subdominio `admin.benechito.com` sin
> tocar la web pública. Login protege `/admin/*` y redirige ahí tras autenticar. Se comunican mediante:
1. **Capa de servicios interna** (funciones/API dentro de la app) — para lecturas y transacciones síncronas.
2. **n8n** — para automatizaciones asíncronas (preventa, cobranza, alertas, avisos).

---

## 3. Estructura de carpetas (módulos)

```
benechito-app/
├─ prisma/
│  ├─ schema.prisma            # un solo schema, secciones por dominio
│  └─ seed.mjs
├─ src/
│  ├─ lib/                     # CORE transversal
│  │  ├─ prisma.ts  auth.ts  permisos.ts  config.ts
│  │  └─ dominio/              # reglas de negocio puras, sin UI
│  │     ├─ precios.ts         # resolver precio por cliente+canal
│  │     ├─ pedidos.ts  ventas.ts  pagos.ts  inventario.ts
│  ├─ modules/
│  │  ├─ comercial/            # catálogo, CRM, pedidos, POS, ruta
│  │  ├─ gestion/              # producción, recetas, compras, calidad, RRHH
│  │  ├─ tecnico/              # activos, mantención, proyectos
│  │  └─ hub/                  # dashboards (solo lectura sobre views)
│  ├─ app/                     # rutas Next.js (App Router)
│  │  ├─ panel/comercial/...
│  │  ├─ panel/gestion/...
│  │  ├─ panel/tecnico/...
│  │  ├─ panel/hub/...
│  │  └─ api/                  # endpoints internos + webhooks n8n
└─ docs/                       # este documento y guías
```

La lógica de negocio vive en `src/lib/dominio/` (pura, testeable). La UI y las rutas solo la invocan.
Esto mantiene la verdad en un lugar y permite que n8n y la IA llamen la misma lógica vía `/api`.

---

## 4. Modelo de datos común (v2)

Principios: producto **único**, precios en **listas**, **venta ≠ pago**, inventario por **ubicación**,
estructura **multiubicación** desde el diseño aunque hoy haya una sola sucursal.

### 4.1 Núcleo (core) — jerarquía y personas

```prisma
model Empresa   { id String @id; nombre String; sucursales Sucursal[] }
model Sucursal  { id String @id; empresaId String; nombre String; ubicaciones Ubicacion[] }
/// Ubicacion = bodega fábrica | sala de ventas | vehículo 1 | vehículo 2 ...
model Ubicacion { id String @id; sucursalId String; nombre String; tipo String } // bodega|sala|vehiculo

model Usuario   { id String @id; email String @unique; nombre String; passwordHash String
                  rol String  // propietario|admin|caja|produccion|bodega|vendedor|chofer|tecnico|rrhh
                  activo Boolean @default(true) }
```

### 4.2 Comercial — catálogo, precios, clientes

```prisma
model Producto {                 // ÚNICO. Un producto, muchos precios.
  id String @id
  sku String? @unique
  codigoBarras String?
  linea String                   // trufa|cuchufli|helado|proteico|...
  nombre String
  categoria String?
  presentacion String?           // "pack 3", "500ml"
  activo Boolean @default(true)
  precios PrecioProducto[]
}

/// Lista de precios por canal/tipo de cliente (Sala, Web, Reparto, Negocio, Revendedor, Distribuidor...)
model ListaPrecio { id String @id; nombre String; canal String; vigenciaDesde DateTime?; vigenciaHasta DateTime? }

model PrecioProducto {           // precio de UN producto en UNA lista
  id String @id
  productoId String; listaId String
  precio Decimal
  cantidadMinima Int @default(1)
  descuento Decimal?
  @@unique([productoId, listaId, cantidadMinima])
}

/// Cliente = prospecto y cliente son la MISMA entidad; cambia el estado. (Hoy: modelo `Negocio`)
model Cliente {
  id String @id
  tipoCliente String   // consumidor|negocio|punto_benechito|revendedor|distribuidor|supermercado|prospecto
  listaPrecioId String? // determina precios; si null, se infiere del tipo
  nombreContacto String; nombreNegocio String?; whatsapp String
  comuna String; ciudad String?; direccion String?
  estado String @default("nuevo")   // nuevo|activo|disminuyendo|inactivo|importante|prospecto
  vendedorId String?
  // métricas derivadas (se calculan, no se editan a mano): ultimaCompra, frecuencia, ticketPromedio, deuda
}
```

### 4.3 Comercial — pedidos, ventas, pagos (SEPARADOS)

```prisma
/// Pedido: intención de compra. Estado propio, INDEPENDIENTE del pago.
model Pedido {
  id String @id
  clienteId String; canal String  // web|whatsapp|sala|vendedor|preventa|distribuidor
  estado String @default("solicitud") // solicitud|confirmado|preparacion|listo|entregado|finalizado
  ubicacionOrigenId String?
  items PedidoItem[]
  venta Venta?
}
model PedidoItem { id String @id; pedidoId String; productoId String; cantidad Int; precioUnit Decimal }

/// Venta: hecho económico. Genera documento y descuenta stock.
model Venta {
  id String @id
  pedidoId String? @unique
  clienteId String; ubicacionId String
  total Decimal; fecha DateTime @default(now())
  documento String?    // boleta|factura (integración tributaria futura)
  estadoPago String @default("pendiente") // pendiente|parcial|pagado|vencido
  pagos Pago[]
}

/// Pago: abono a una venta. Una venta puede tener varios. (venta ≠ pago)
model Pago {
  id String @id
  ventaId String
  medio String   // efectivo|transferencia|tarjeta|credito|otro
  monto Decimal
  fecha DateTime @default(now())
}
```

### 4.4 Inventario multiubicación

```prisma
/// Stock de un producto EN una ubicación. Cargar un vehículo = TRANSFERENCIA, no venta.
model Stock { id String @id; productoId String; ubicacionId String; cantidad Int @default(0)
              @@unique([productoId, ubicacionId]) }

model MovimientoStock {
  id String @id
  productoId String
  tipo String     // ingreso|venta|transferencia|merma|ajuste|produccion
  ubicacionOrigenId String?; ubicacionDestinoId String?
  cantidad Int; referencia String?; fecha DateTime @default(now())
}
```

### 4.5 Gestión y Técnico (esbozo, se detallan en su fase)

- **Gestión:** `Receta`(versionada, nunca sobrescribir histórica) · `OrdenProduccion` · `Lote`(trazabilidad
  materia prima→proveedor→lote→producto→venta→cliente) · `Proveedor` · `OrdenCompra` · `Trabajador`.
- **Técnico:** `Activo` · `Mantencion`(preventiva/correctiva) · `Proyecto`.

### 4.6 Migración desde el esquema actual

- `Negocio` → `Cliente` (renombrar campos; `interesPunto`/`interesHelados` se conservan como notas/tags).
- `Producto` actual → `Producto` v2 + tabla `PrecioProducto` (los precios que hoy no existen se agregan).
- `PuntoProducto` se mantiene (qué hay instalado en una góndola).
- `Reposicion` se mantiene y luego se relaciona con `MovimientoStock`.
- **La migración se hace en una rama, con `prisma migrate`, sin tocar producción hasta validar.**

---

## 5. Comunicación entre módulos

1. **Síncrona (dentro de la app):** los módulos llaman funciones de `src/lib/dominio/`. No hay HTTP interno
   entre módulos del mismo despliegue → simple y transaccional.
2. **Asíncrona (n8n):** eventos de negocio disparan webhooks a n8n para automatizar. Ejemplos:
   preventa antes de ruta, recordatorio de cobranza, alerta de stock crítico, cliente inactivo,
   documento por vencer, aviso de producción. **n8n nunca es la fuente de verdad; lee/escribe vía `/api`.**
3. **Externa (IA / WhatsApp):** los agentes y el chatbot consultan `/api` en modo lectura. La IA
   **no inventa** precios, stock, deuda ni condiciones (§6, §34): siempre los toma de la BD.

### 5.1 Principio "cada canal, su ficha → central" (clave)

Cada rol/canal recibe **solo su ficha** (formulario/vista mínima), la completa, y toda la
información confluye a la **central** (la BD, fuente única). Nadie ve de más; se **registra una vez**.

| Rol / canal | Ficha que recibe (entrada) | Qué alimenta en la central |
|-------------|----------------------------|----------------------------|
| Ventas / vendedor | Toma de pedido, nueva venta, cobro | `Pedido`, `Venta`, `Pago` |
| Reparto / chofer | Ruta del día, entregas, cobranza | estado `Pedido`, `Pago`, `MovimientoStock` |
| Bodega | Recepción, transferencias, stock | `Stock`, `MovimientoStock` |
| Fabricación / producción | Orden de producción, merma, lote | `OrdenProduccion`, `Lote`, `Stock` (+) |
| Facturación | Documento a emitir por venta | `Venta.documento`, integración tributaria |
| Compras | Orden de compra, recepción | `OrdenCompra`, `Stock` |

Regla de diseño: **una acción se captura en el punto donde ocurre, en la ficha más simple posible**,
y la central deriva todo lo demás (indicadores, cuentas, cuadres). Esto se apoya en el modelo de
**roles y permisos** (§6): cada usuario solo ve/edita su ficha.

---

## 6. Seguridad, autenticación y permisos

- **Autenticación:** login por email+contraseña (hash), como hoy. Sesión del panel.
- **Roles** (§35): `propietario, admin, caja, produccion, bodega, vendedor, chofer, tecnico, rrhh`.
  Cada rol ve solo su módulo/vistas. Regla en `src/lib/permisos.ts`, aplicada en middleware de rutas.
- **Auditoría:** acciones críticas (ventas, pagos, cambios de precio, transferencias de stock, cambios
  de estado de cliente) se registran en una tabla `Auditoria` (usuario, acción, entidad, antes/después, fecha).
- **Secretos:** en variables de entorno (EasyPanel), nunca en el repo. `EVOLUTION_*` viven en n8n, no en la app.
- **Backups:** respaldo periódico de Postgres (tarea programada en el VPS).

---

## 7. Hub y metas

- Los dashboards **no almacenan números**: se calculan con *SQL views* / agregaciones sobre las tablas reales.
- Filtros del Hub: Hoy | Semana | Mes | Temporada | Año · Sucursal | Canal | Ruta | Vendedor | Categoría.
- **Metas:** tabla `Meta`(tipo, periodo, objetivo). El Hub muestra `Meta → Real → Diferencia → % cumplimiento`.

---

## 8. Roadmap de entregables (pequeños y verificables)

Cada entregable se hace en rama, se revisa y recién luego se despliega. Ninguno rompe lo que ya funciona.

| # | Entregable | Alcance | Valida |
|---|-----------|---------|--------|
| **E1 ✅** | **Modelo de datos común v2** | Esquema Prisma §4 + migración desde actual, sin UI | HECHO — migración aplicada, `tsc` limpio, datos intactos |
| **E2 ✅** | Catálogo + listas de precios | Producto único, precio resuelto por cliente/canal | HECHO — panel de listas + editor de precios + `lib/dominio/precios.ts` + alta/edición de productos + clasificación de cliente (tipo + lista). Probado end-to-end en navegador y BD |
| **E3 ✅** | Pedidos multicanal | `Pedido` con estado independiente del pago | HECHO — crear pedido (cliente+canal) → agregar líneas con precio resuelto por la lista del cliente → total → transición de estados. Probado end-to-end (Frutilla×2 @ lista = $6.000) |
| **E4 ◐** | POS + Caja + stock | Venta rápida, descuento de stock, apertura/cierre de caja | POS HECHO (venta rápida + descuento de stock + pago). Pendiente: apertura/cierre/arqueo de caja |
| **E5 ✅** | Pagos + cuenta corriente | `Venta`/`Pago` separados, saldos, estados | HECHO — abonos parciales cuadran saldo; cuenta corriente por cliente |
| **E6 ◐** | Ruta / preventa / cierre | CRM ruta, carga vehículo (transferencia), cierre de ruta | Inventario multiubicación + transferencia (cargar vehículo) HECHO. Pendiente: preventa, planificación de ruta, cierre |
| — | CRUD completo | Agregar/cambiar/eliminar en todas las entidades | HECHO — productos, clientes, listas, pedidos, ventas, pagos, ubicaciones |
| E7 | Gestión | Producción, recetas versionadas, lotes, compras | Trazabilidad MP→producto→cliente |
| E8 | Técnico | Activos, mantención, proyectos | Alerta de mantención vía n8n |
| E9 | Hub + metas + IA | Dashboards calculados, agentes IA sobre BD | Números coinciden con datos reales |

**Siguiente paso concreto:** implementar **E1** en una rama `feature/modelo-v2`.

---

## 9. Principios técnicos que este diseño respeta (§37)

Fuente única de verdad · no duplicar · modular · API entre módulos · n8n solo cuando aporta ·
IA desacoplada · auditoría · seguridad y permisos · backups · escalabilidad sin sobreingeniería ·
priorizar lo existente · móvil primero (vendedor/chofer) · interfaces simples · integrar antes que reconstruir.
