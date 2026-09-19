# 🍯 Panal — kit comercial (producto replicable)

Panal es la versión **producto/marca blanca** del sistema Benechito: el mismo motor
probado en nuestras fábricas y locales, ofrecido como un **ecosistema modular** que
cualquier negocio de comida arma "celda por celda".

Estos archivos son **autónomos**: se abren con doble clic en cualquier navegador, o se
publican en cualquier hosting estático. No dependen de la app Next.js.

## Archivos

| Archivo | Qué es | Para qué |
|---|---|---|
| `landing.html` | Landing comercial (tema oscuro, abeja robótica, 9 celdas con detalle, historia, packs por rubro y servicios) | Mostrarla al cliente / compartir link |
| `presentacion.html` | **Documento para presentar**: dossier con problema→solución, 11 celdas, cómo funciona, sectores y **planes con valores**; imprimible y con tema claro/oscuro | Presentar a un cliente (pantalla o PDF) |
| `configurador.html` | **Configurador**: activa módulos y casillas por cliente, elige rubro, ajusta precios, y genera el "Resumen para implementar" + "Prompt maestro" | Armar y replicar el sistema de cada cliente |
| `cotizador.html` | **Cotizador por sector**: elige el sector → renombra las áreas, muestra un pitch a medida y el pack + precio recomendado; copia o envía la cotización por WhatsApp | Cerrar precio adaptado al rubro |

> La landing también vive en la raíz como `panal-landing.html` (misma versión) por
> compatibilidad con `MIGRACION.md`.

## Módulos (celdas) — el catálogo

1. Producción y control de calidad ★
2. Ventas · Vendedor en ruta ★
3. Repartos y retiros ★
4. Inventario
5. Clientes y deudas
6. Panel central
7. Facturación
8. Recetas y materias primas
9. Agenda y citas (servicios)
10. Mejoras y proyecciones
11. Tienda online y Portal del Cliente ★

**Extensiones:** 14 Facturación electrónica (SII) · 15 Compras/Turnos/Portal ·
16 Cobranza/Trazabilidad/Rentabilidad · 17 Capacitación/BPM/Metas/EPP.

## Planes y valores (referenciales, editables)

| Plan | Instalación (una vez) | Mensual (soporte · hosting · mejoras) |
|---|---|---|
| Básico (≤3 celdas) | $250.000 – $400.000 | $25.000 – $40.000 |
| Producción (≤6 celdas) | $450.000 – $700.000 | $40.000 – $60.000 |
| Completo (7+ celdas) | $900.000 – $1.500.000 | $60.000 – $100.000 |
| A medida | a definir | a definir |

**Servicios que se venden aparte:** Landing sola $99.000 · Catálogo/tienda $120.000 ·
Marketing y redes $150.000/mes (3 posts/sem FB+IG) · Creación fanpage $120.000.

## Packs recomendados por rubro

Heladería/Dulces · Distribuidora · Panadería · Fábrica · Almacén/Minimarket ·
Comida rápida/Restaurante · Construcción · Manufactura · Consultoría (agenda) · A medida.
Cada rubro parte con un panal sugerido y se amplía celda a celda.

## Cómo replicar a un cliente nuevo

1. Abre `configurador.html`, escribe los datos del cliente y elige su **rubro**
   (se marcan los módulos sugeridos).
2. Ajusta módulos, casillas, extensiones y **precios** a lo que contrató.
3. Copia el **"Resumen para implementar"** (checklist + orden de construcción) y el
   **"Prompt maestro"** para levantar su app.
4. Comparte `landing.html` con su marca / usa `cotizador.html` para cerrar el precio.

## Para agregar o quitar un módulo, casilla o extensión

Todo el catálogo vive en las listas de `configurador.html`:

- **Módulo nuevo** → agrega un objeto a `MODULOS` (`id`, `key`, `nombre`, `sub`, `demo`, `cas[]`).
- **Casilla nueva** → agrega `{k, n, d}` al `cas` del módulo.
- **Extensión** → agrega a `EXTS`.
- **Rubro/pack** → agrega a `RUBROS` (qué módulos y extensiones marca).
- **Precios/planes** → edita `PLAN_PRECIO` y `PLAN_LABEL`.

El mismo criterio aplica a `cotizador.html` (listas `MODULOS`, `EXTENS`, `PLAN`, `PRESETS`).

## Artifacts relacionados (sesión anterior)

Ficha del Cliente · Contrato y Cotización · Generador de Landing · Runbook de Provisión ·
Operación Panal · Playbook de Ventas · Kit de Venta / Publicidad Panal. Viven como
artifacts en claude.ai/code/artifacts (búsqueda: "Panal").
