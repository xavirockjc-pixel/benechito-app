# 🐝 Panal — Estado del proyecto (punto de continuación)

> Documento para retomar el proyecto desde cualquier equipo o sesión de Claude Code.
> **Léelo primero** antes de seguir trabajando.

## Qué es Panal
Empresa de servicios que vende soluciones digitales a comercios y profesionales
(cotizadores, landing, menú QR, agenda, reseñas, ecosistema). Javier vende y actualiza
contenido; Claude hace todo lo técnico. **Un cliente = un proyecto independiente.**

## Dónde vive todo
- **Repositorio:** `xavirockjc-pixel/benechito-app`
- **Rama con el trabajo actual:** `claude/upbeat-goldberg-7mjlg6`
- **Carpeta del proyecto:** `panal/` (y clientes en `panal/clientes/`)

> Para ver TODO lo avanzado en otra sesión: `git fetch origin` y basa tu trabajo en la
> rama `claude/upbeat-goldberg-7mjlg6`.

## Lo que ya está construido (cotizadores)
| Archivo | Qué es | Artifact (para mostrar) |
|---|---|---|
| `panal/clientes/armador-alfayomega.html` | **Cotizador Landing** de Alfa y Omega: hero 3D (Three.js), galería, servicios seleccionables, planes por N° de equipos, firma + PDF | https://claude.ai/artifact/CToCDE3jw1Amv83EJRc5Qz |
| `panal/plantilla-cotizador-landing.html` | **MOLDE maestro**: selector de **22 rubros** → segmentos; cambia colores, tipografía y 3D por rubro; firma + PDF | https://claude.ai/artifact/Bpf3zxj9PrP8mBoKZ7shnB |
| `panal/clientes/cotizador-pro-alfayomega.html` | Cotizador **Pro**: planes de mantención (equipos × visitas) | https://claude.ai/artifact/HN6rutJCumNZvoCpKYLZ69 |
| `panal/plantilla-cotizador-trabajo.html` | Cotizador **por trabajo** (ítems puntuales) | https://claude.ai/artifact/JW8nEMKhLb2gfqUurY18xv |

Todos cierran con **aceptación formal**: términos → casilla → **firma con el dedo** →
**PDF firmado** (`Cotizacion-NNN-Aceptada-Firmada.pdf`) con folio y huella de versión.
`jsPDF` y `Three.js` van **incrustados** (funcionan sin internet / en Hostinger).

## Otras piezas de Panal (ya existentes en `panal/`)
- `index.html` → **Panal Home** (menú de productos) · `landing.html` → landing de venta
- `catalogo.html` → catálogo de servicios · `centro-montaje.html` → control de clientes (hasta 112)
- `plantilla-menu-qr.html`, `plantilla-agenda.html`, `plantilla-resenas.html`, `plantilla-tienda.html`
- `clientes/ecosistema-multinegocio.html` → ecosistema con nube (sistema completo)
- Guías: `USAR-COTIZADOR.md`, `PRECIO-COTIZADORES.md`, `HOSTING-HOSTINGER.md`, `VENDER-*.md`

## Cómo editar los cotizadores (marca blanca)
Cada página se maneja desde sus botones: **🎨 Rubro** (solo el molde), **⚙️ Negocio**,
**🧩 Servicios**, **📋 Planes**, **🖼️ Galería**, **📝 Términos**. La config vive en un
bloque `NEGOCIO` entre `/*NEGOCIO_START*/` y `/*NEGOCIO_END*/`. Las imágenes se incrustan
como base64. Para probar firma/PDF: abrir el archivo en un navegador (no en el preview).

## Pendientes (lo que sigue)
1. **Hostinger / dominio:** Javier tiene plan Hostinger ampliado (8GB/2TB). Falta confirmar
   el nombre del dominio (¿`panalins…`? ¿temporal o registrado?) y decidir si se compra
   `panal.cl`. Montar los 3 "conejillos": **Benechito, Panal, Bailanta**.
2. **Link público:** subir un cotizador a Hostinger con el dominio para probarlo de verdad
   y mandarlo por WhatsApp.
3. **Agencia de marketing:** sitio donde publicar videos e instalar a las empresas que
   contraten el servicio de marketing (IG/FB).
4. Agregar rubros nuevos al molde si se piden (transporte, seguridad, limpieza, etc.).

## Precios (referencia, ver `PRECIO-COTIZADORES.md`)
- Cotizador por Trabajo: $120.000 + $15.000/mes
- Cotizador Pro (planes): $150.000 + $20.000/mes
- Cotizador Landing / Molde (premium, con 3D): $280.000 + $30.000/mes
- Combos: + Marketing $150.000/mes.

---

## 🔀 Trabajo en paralelo (dos equipos, sin chocar)
Regla de oro: **cada sesión trabaja en SU propia rama y en SU propia área.** El
repositorio es el punto común; nadie copia archivos a mano.

- **Sesión A (equipo 1):** cotizadores y el molde (`plantilla-cotizador-landing.html`,
  `clientes/*cotiz*`, `clientes/armador-*`).
- **Sesión B (equipo 2):** página/landing de Panal, agencia de marketing y montaje de los
  3 clientes conejillo + Hostinger.

Antes de empezar: `git fetch origin` y parte desde `claude/upbeat-goldberg-7mjlg6`.
Haz tus cambios en **tu propia rama** y súbelos. Para juntar lo de ambas sesiones, se
mezclan las ramas (merge) cuando corresponda — pídelo y Claude lo hace.
No edites el mismo archivo desde las dos sesiones a la vez.

---

## 🧭 Los DOS mundos de Panal (clave para no chocar entre sesiones)
Panal tiene dos infraestructuras distintas. Cada sesión trabaja la suya.

- **Mundo WEB estático — ESTA sesión / repo GitHub `benechito-app`.**
  Cotizadores, molde de 22 rubros, landing de Panal, menú/agenda/reseñas, centro de
  montaje. Son páginas autónomas (HTML) que se suben a **Hostinger (hosting web)** por
  carpetas o subdominios. **Esta sesión ve el repositorio, NO el VPS ni las carpetas
  locales del PC.**
- **Mundo APPS + AUTOMATIZACIÓN — sesión del PC Nitro.**
  El ecosistema de gestión (Benechito vivo), n8n y el nuevo **Panal Marketing IA**. Vive
  en el **VPS (EasyPanel)**, no en este repo. Esa sesión tiene acceso a las carpetas
  locales del PC y al VPS.

> Para que la sesión del repo trabaje algo del otro mundo, ese material debe subirse al
> repositorio o describírmelo. Son compatibles, no se pisan.

## 🎬 Panal Marketing IA (plan de la sesión Nitro — resumen)
Motor self-hosted de creación + publicación de contenido (reels/video), que luego se
vende como servicio mensual de Panal.
- **Stack:** n8n (ya instalado) + **Postiz** (publicador open-source, en EasyPanel) +
  FFmpeg (montaje económico) + API de video IA (Sora 2 / Veo 3.1) solo para premium +
  Postgres como "cerebro" por cliente.
- **Pilotos:** Benechito, Él Va Delante y **Panal** (Panal se publicita con su propio motor).
- **3 niveles:** económico (fotos reales — Benechito), intermedio, premium (IA — EVD).
- **Pendiente de esa sesión:** revisar RAM del VPS antes de instalar Postiz; dar HTTPS al
  panel (`panel.benechito.com`) y a Postiz (`publicar.benechito.com`); luego conectar redes.

## ⛔ Bloqueo actual: validación de Facebook / Meta
Para que Postiz publique en Instagram/Facebook hay que crear **una app de desarrollador en
Meta** (una sola vez; sirve para las 3 marcas y futuros clientes). El bloqueo típico: Meta
pide **verificación de negocio** o la app está en **modo desarrollo**.

**Cómo desbloquear AHORA (solo para tus propias 3 cuentas):**
- La cuenta de Instagram debe ser **Profesional/Business** y estar **vinculada a una página
  de Facebook**.
- En la app de Meta, **agrégate a ti mismo como administrador/tester** y deja la app en
  **modo Desarrollo**: así publicas en **tus propias** cuentas **sin pasar App Review ni
  verificación de negocio**.
- La **App Review + verificación de negocio** (subir datos/documentos de la empresa a Meta)
  **solo se necesita al conectar cuentas de CLIENTES externos** — NO para los pilotos. Eso
  queda para cuando la agencia tenga clientes reales.
