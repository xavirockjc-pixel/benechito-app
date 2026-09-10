import { redirect } from "next/navigation";

// La sección "Productos" se reemplazó por el Catálogo con fotos en el inicio.
export default function ProductosRedirect() {
  redirect("/vendedor");
}
