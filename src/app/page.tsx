import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Coleccion from "@/components/Coleccion";
import CtaFinal from "@/components/CtaFinal";
import Footer from "@/components/Footer";
import {
  ConoceBenechito,
  Helados,
  PuntosBenechito,
  Promociones,
  Innovacion,
  FranjaWhatsapp,
} from "@/components/Secciones";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Portada */}
        <Hero />
        {/* Conoce Benechito */}
        <ConoceBenechito />
        {/* Nuestros helados */}
        <Helados />
        {/* Dulces Benechito (trufas, cuchuflís, cocadas) */}
        <Coleccion />
        {/* Puntos Benechito (propuesta para comercios) */}
        <PuntosBenechito />
        {/* Promociones y packs (sin precios) */}
        <Promociones />
        {/* Franja WhatsApp */}
        <FranjaWhatsapp />
        {/* Siempre algo nuevo */}
        <Innovacion />
        {/* Contacto / WhatsApp / formulario */}
        <CtaFinal />
      </main>
      <Footer />
    </>
  );
}
