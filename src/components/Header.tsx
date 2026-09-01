import Logo from "./Logo";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-crema-2/70 bg-crema/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
        <a href="#inicio" aria-label="Benechito inicio">
          <Logo className="h-10" />
        </a>
        <nav className="hidden items-center gap-6 text-sm font-bold text-tinta md:flex">
          <a href="/tienda" className="hover:text-azul transition">🛒 Tienda</a>
          <a href="#helados" className="hover:text-azul transition">Helados</a>
          <a href="#dulces" className="hover:text-azul transition">Dulces</a>
          <a href="#promociones" className="hover:text-azul transition">Promos</a>
          <a href="#puntos" className="hover:text-azul transition">Puntos</a>
          <a href="#contacto" className="hover:text-azul transition">Contacto</a>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="/tienda"
            className="rounded-full bg-azul px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-azul-2 hover:shadow-lg"
          >
            🛒 Comprar
          </a>
          <a
            href="#contacto"
            className="hidden rounded-full bg-naranja px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-naranja-2 hover:shadow-lg sm:inline-block"
          >
            Quiero un Punto
          </a>
        </div>
      </div>
    </header>
  );
}
