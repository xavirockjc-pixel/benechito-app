import { redirect } from "next/navigation";
// Retirado: los surtidos de postres entran por "Recibir de producción" (bolsas
// de 16) y el stock por sabor va en el inicio. Ruta mantenida por accesos antiguos.
export default function SurtidosRedirect() {
  redirect("/bodega");
}
