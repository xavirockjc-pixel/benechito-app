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
Limpieza de lo cruzado (HECHO): `ruta` y `sector` ahora REDIRIGEN al inicio →
pestaña "Clientes" (filtra por sector) + "Armar ruta". `agendados`, `entregas`,
`pedidos` ya redirigían a "Pedidos online". Se mantiene `agenda` (agendar
entrega desde el perfil del cliente) y los flujos de venta/factura
(venta-rapida, venta-mano, factura-rapida, "Por facturar") intactos.
Nada se borró: las rutas viejas siguen respondiendo (redirección).
## Fase 4 · Caja (EN CURSO)
- Apertura caja vecina: ahora pide EFECTIVO para giros + CUPO para recibir +
  FOTO del cupo/máquina (campo `foto` ya existía en el modelo).
- Cierre de caja: el mensaje ahora es COMBINADO (ventas + caja vecina:
  efectivo, giros, para depositar, comisión) y hay bloque visible + link a
  cerrar caja vecina. `AvisoAperturas` ya recuerda abrir ambas al llegar.
- POS ventas ya tiene: buscar al escribir (type-ahead), descuento y precio
  manual por línea + escalera por cantidad (tramos). Los precios por volumen
  de Tú y Yo (100/300) se cargan en Panel → Precios (dato, no código).
## Fase 4 · Bodega (HECHO)
Ya venía ordenada (entradas/salidas por motivo, registro por día, packs vs por
unidad, enviar stock por WhatsApp). Ahora: barra inferior a 4 (Bodega · Registro
· Surtidos · Cierre); Insumos e Higiene pasan a accesos en el inicio (la barra
quedaba apretada en celular). El registro por día (central) y el bot analista ya
leen los movimientos de bodega.

## Fase 4 · Bodega (ajuste 2)
- Se RETIRA "Surtidos" (no se usa: los surtidos de postres entran por "Recibir
  de producción" como bolsas de 16). La ruta redirige a /bodega. Barra inferior:
  Bodega · Registro · Recibir · Cierre.
- Más motivos de SALIDA: 🚚 camión (ruta), 📦 pedido, 💰 venta, 🏪 local,
  🏭 fábrica, 🏭 distribuidor, otro. (Se descuentan de bodega y quedan en el
  registro por día para el socio/analítica.)
- Tú y Yo = packs de 50 (Tradicional/Surtido); postres = bolsas de 16. El stock
  por sabor queda en un recuadro desplegable para no saturar.

## Fase 4 · Producción (pendiente)

## Fase 4 · Bodega (ajuste 3)
- Copa Garza + Balde 5 L en el catálogo (por unidad).
- Stock con icono (dibujito) + corrección manual clara (no merma).
- Tú y Yo por sabores (texto libre): aparta/vende bolsas de 50 por sabor,
  descuenta de Tú y Yo Surtido y queda registrado con el sabor.
- Caja de fábrica (DineroBodega): dinero recibido en bodega por ventas
  directas (monto + de quién) con cierre; pendiente llevarlo al registro
  central/analítica.

## Fase 4 · Producción (HECHO v1)
- Lugar/máquina por registro: Yobilo / Villamora (+ turno).
- Helados producidos: form para registrar cuántos helados hizo el turno
  (Tú y Yo, paletas, postres, baldes, copas) → log por turno/lugar/quién.
- Pago por producción (/produccion/pagos): calendario por día, agrupado por
  turno+lugar, helado × precioTrato (editable) = total del turno.
- Nota obligatoria lunes a viernes en el inicio (banner si falta).
Pendiente (para el cuadre general): llevar pago/producción a la analítica central.
