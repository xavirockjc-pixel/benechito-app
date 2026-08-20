import Logo from "./Logo";
import { site } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="bg-tinta py-10 text-white/80">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center">
        <Logo claro className="h-12" />
        <p className="script text-2xl text-dorado-2">{site.mantra}</p>
        <p className="max-w-md text-sm text-white/70">{site.esencia}.</p>
        <p className="text-sm text-white/60">{site.tagline}</p>
        <a
          href={site.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-white/70 underline-offset-2 hover:underline"
        >
          📍 {site.direccion} · {site.salaVentas}
        </a>
        <p className="text-sm text-dorado-2">
          {site.instagram} · {site.web}
        </p>
        <p className="text-xs text-white/40">
          © {new Date().getFullYear()} Benechito · Hecho a lo Benechito
        </p>
      </div>
    </footer>
  );
}
