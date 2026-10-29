import { redirect } from "next/navigation";
// Unificado en "Pedidos online" (sección Entregados). Ruta mantenida por accesos antiguos.
export default function EntregasRedirect() {
  redirect("/vendedor/pedidos-online");
}
