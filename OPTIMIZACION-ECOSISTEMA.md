# Optimización del ecosistema Benechito

Objetivo: dejar el ecosistema fácil de usar (trabajadores y administración),
quitando lo que sobra. Regla: **ocultar primero, borrar después** — nada se
elimina de golpe; se retira del menú, se confirma que nadie lo usa y recién
entonces se borra el código.

> ⛔ **REGLA FIRME:** NUNCA borrar datos de **clientes, fiados (lo que deben) ni
> ruta**. Son información valiosa. Antes de cualquier limpieza de datos, respaldar.
> La limpieza de este plan es solo de **pantallas/vistas del panel**, nunca de datos.

## Diagnóstico (nov 2026)
- `/admin`: 66 rutas, ~99 ítems de menú → el punto más cargado.
- Apps de trabajadores razonables: Caja (15), Bodega (7), Producción (8).
  Vendedor (30) a revisar.
- Se pisan: vistas de resumen (Panel/Esencial/Resumen/Panorama/Tablero/Supercerebro),
  gestión de tareas (Notas/Mejoras/Agenda/Recordatorios/Pendientes/Socio),
  análisis (Rentabilidad/Rentabilidad-productos/Ventas-Local/Estado-financiero).

## Fase 1 — Adelgazar el Panel (EN CURSO)
Retirado del **menú** (ruta sigue viva; candidata a borrar si nadie la usa):
- `/admin/dashboard` (Tablero antiguo) — reemplazado por Resumen/Registro por día.
- `/admin/supercerebro` — reemplazado por Pendientes del cerebro.
- `/admin/panorama` — duplica Panel/Resumen.
- `/admin/socio` — se absorberá en el Gestor (fase 2).
- `/admin/rentabilidad` — duplica Rentabilidad productos + Finanzas.
- `/admin/ventas-local` — duplica Historial/Registro por día.
- `/admin/esencial` — se quitó del menú (duplica "Resumen de hoy").

## Fase 2 — Gestor interno (HECHO v1)
Nueva pantalla `/admin/gestor` que junta en un solo lugar: 🐝 avisos del cerebro,
✅ por hacer (Mejoras + Notas-tarea), 🗓️ Agenda próxima y 📝 Notas/ideas.
Reutiliza las acciones existentes (no duplica datos). En modo simple reemplaza el
trío Notas/Mejoras/Agenda del menú. Las pantallas de detalle siguen accesibles.
Pendiente opcional: absorber Recordatorios de clientes y Socio.

## Fase 3 — Bot analista (HECHO v1)
`src/lib/dominio/analista.ts` arma resumen (ventas hoy vs ayer, facturas por
enviar) + avisos del cerebro. Ruta `GET /api/analista?token=REPORTE_TOKEN`
(opcional `&modo=alertas`) lo manda por Telegram. En el Gestor hay botón del
dueño "📲 Enviarme ahora".
EasyPanel: programar un cron diario a `/api/analista?token=...` (y opcional cada
X horas con `&modo=alertas`). Requiere TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID.

## Fase 4 — App por app (EN CURSO · Vendedor)
Decisiones del dueño para Vendedor (NO retirar, se quieren):
- Mantener: elegir **ruta por sector → ver clientes → preventa**.
- Mantener: **agendados online** (PedidoReparto) visibles APARTE de la ruta fija
  (particulares/agendas por día o zona). → Hecho v1: en la pestaña "Clientes",
  al elegir sector se muestran los agendados online de esa zona.
- Mantener: **"Por facturar"** (facturas pendientes) porque el facturador
  automático aún no está; la factura se hace desde el perfil del cliente.
- Mantener el **registro por cliente** (última visita, deuda, dónde pasar) para
  que el bot/cerebro responda a futuro.
- Limpiar solo lo cruzado/duplicado SIN tocar fiados ni ventas comprometidas.
  (Pendiente: decidir con el dueño qué listas viejas ocultar — ruta/sector
  vs Clientes, agenda/agendados/entregas/pedidos vs Pedidos online.)
Caja / Bodega / Producción: pendientes.
