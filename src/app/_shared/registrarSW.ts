// Registra el service worker con AUTO-ACTUALIZACIÓN: cuando se despliega una versión
// nueva, el SW nuevo toma control y la página se recarga sola una vez. Así se evita
// el error "Failed to find Server Action" por tener una pestaña vieja abierta.
//
// Además revisa si hay versión nueva al volver a la app (foco / visible) y cada minuto.

export function registrarSW(url: string, scope: string) {
  if (!(process.env.NODE_ENV === "production" && typeof navigator !== "undefined" && "serviceWorker" in navigator)) return;

  const sw = navigator.serviceWorker;
  // ¿La página ya estaba controlada por un SW al cargar? Si no (primera instalación),
  // no recargamos, para no sorprender con un reload en la primera visita.
  const yaControlada = !!sw.controller;
  let recargando = false;

  sw.addEventListener("controllerchange", () => {
    if (recargando || !yaControlada) return; // solo recarga cuando es una ACTUALIZACIÓN
    recargando = true;
    window.location.reload();
  });

  sw.register(url, { scope }).then((reg) => {
    const revisar = () => { reg.update().catch(() => {}); };
    // Revisa al volver a la app y de a ratos (para pestañas que quedan abiertas).
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") revisar(); });
    window.addEventListener("focus", revisar);
    setInterval(revisar, 60 * 1000);
  }).catch(() => {});
}
