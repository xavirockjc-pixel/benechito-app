import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PortalGracias() {
  return (
    <div className="min-h-screen bg-crema">
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-verde/15 text-3xl">🤝</div>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-choco">¡Registro recibido!</h1>
        <p className="mt-1 text-sm text-choco-2">
          Gracias por sumarte. Revisaremos tu negocio y te contactaremos por WhatsApp para activar tu cuenta y coordinar tu primer pedido.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/tienda" className="rounded-full bg-azul px-6 py-3 text-sm font-bold text-white active:scale-95">🛒 Ver el catálogo mientras tanto</Link>
          <Link href="/portal" className="text-sm font-semibold text-choco-2">← Volver al portal</Link>
        </div>
      </div>
    </div>
  );
}
