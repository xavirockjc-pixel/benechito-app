import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito, Pacifico } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Benechito · Helados y dulces artesanales",
  description:
    "Helados y dulces artesanales hechos a nuestra manera. Porque nuestra esencia es hacer bien las cosas. Paletas, postres, trufas y cuchuflís. Lleva Benechito a tu negocio.",
  openGraph: {
    title: "Benechito · Helados y dulces artesanales",
    description:
      "Hecho a lo Benechito. Paletas, postres helados, trufas y cuchuflís. Lleva Benechito a tu negocio.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf8ef" },
    { media: "(prefers-color-scheme: dark)", color: "#12100e" },
  ],
};

// Aplica el tema guardado ANTES de pintar (evita el parpadeo claro→oscuro).
const noFlash = `(function(){try{var t=localStorage.getItem('tema');if(t!=='light'&&t!=='dark'){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches)?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${baloo.variable} ${nunito.variable} ${pacifico.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-papel">
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
