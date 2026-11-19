import { redirect } from "next/navigation";
// Unificado en el inicio del Vendedor → pestaña "Clientes" (filtra por sector) y
// en "Armar ruta del día". Ruta mantenida por accesos directos antiguos.
export default function SectorRedirect() {
  redirect("/vendedor?t=dia");
}
