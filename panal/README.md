# 🍯 Panal — kit comercial (producto replicable)

Panal es la versión **producto/marca blanca** del sistema Benechito: el mismo motor
probado en nuestras fábricas y locales, ofrecido como un **ecosistema modular** que
cualquier negocio de comida arma "celda por celda".

Estos archivos son **autónomos**: se abren con doble clic en cualquier navegador, o se
publican en cualquier hosting estático. No dependen de la app Next.js.

## Archivos

**Empieza por `index.html` (Panal Home)** — el hub que enlaza todo. Todos los archivos abren
con doble clic, sin servidor ni internet.

| Archivo | Qué es | Para qué |
|---|---|---|
| `index.html` | **Panal Home**: hub con lo público (para el cliente) y tus herramientas (internas) | Punto de entrada único |
| `landing.html` | Landing comercial (portada por sector, 9 celdas con detalle, packs y servicios) | Mostrarla al cliente / compartir link |
| `presentacion.html` | **Documento para presentar**: dossier con problema→solución, 11 celdas, sectores y **planes con valores**; imprimible | Presentar a un cliente (pantalla o PDF) |
| `centro.html` | **Centro de Control (el motor)**: gestiona clientes; genera cotización + prompt de construcción + checklist; guarda en el navegador y **exporta respaldo JSON** | Tu tablero de trabajo y control |
| `configurador.html` | **Configurador**: activa módulos y casillas con ilustración; genera el "Resumen para implementar" + "Prompt maestro" | Armar el sistema de cada cliente |
| `cotizador.html` | **Cotizador por sector**: elige el sector → pitch a medida y pack + precio; copia o envía por WhatsApp | Cerrar precio por rubro |
| `RESPALDO.md` | **Plan de respaldo y continuidad**: dónde vive todo y cómo retomar si algo se cae | Tu control / independencia |

### Flujo de trabajo (tú + Claude)
1. **Registrar** el cliente en `centro.html` y elegir su sector.
2. **Cotizar** → aprobar y enviar por WhatsApp.
3. **Construir** → copiar el "Prompt de construcción" y pasarlo a Claude (programa, ejecuta, despliega).
4. **Entregar** → revisar con el checklist y **descargar el respaldo JSON**.

Respaldo: repo (GitHub) + `panal-respaldo-*.json` del Centro + `pg_dump` de la app. Con esos 3, se
reconstruye todo. Detalle en `RESPALDO.md`.

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
