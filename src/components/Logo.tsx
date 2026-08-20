import Image from "next/image";

/**
 * Logo oficial Benechito (archivo original, no reinterpretar).
 * `claro` lo coloca sobre una píldora blanca para fondos de color.
 */
export default function Logo({
  claro = false,
  className = "h-11",
}: {
  claro?: boolean;
  className?: string;
}) {
  const img = (
    <Image
      src="/marca/logo.png"
      alt="Benechito — Productos Artesanales Helados"
      width={800}
      height={619}
      priority
      className={`${className} w-auto`}
    />
  );

  if (claro) {
    return (
      <span className="inline-flex rounded-2xl bg-white px-3 py-2 shadow-md">
        {img}
      </span>
    );
  }
  return img;
}
