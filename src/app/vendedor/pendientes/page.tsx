import { redirect } from "next/navigation";
// Unificado en "Pedidos online". Ruta mantenida por accesos directos antiguos (Share Target PWA).
export default function PendientesRedirect() {
  redirect("/vendedor/pedidos-online");
}
