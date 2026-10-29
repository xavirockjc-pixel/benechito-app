import { redirect } from "next/navigation";
// Unificado en "Pedidos online". Se mantiene la ruta por accesos directos antiguos.
export default function AgendadosRedirect() {
  redirect("/vendedor/pedidos-online");
}
