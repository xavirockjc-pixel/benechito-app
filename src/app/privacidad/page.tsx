export const metadata = {
  title: "Política de Privacidad — Benechito / Panal",
  description:
    "Política de privacidad de Benechito y de las herramientas de gestión y publicación de contenido de Panal.",
};

const S = {
  wrap: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "40px 20px 80px",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    color: "#1f2937",
    lineHeight: 1.7,
  } as const,
  h1: { fontSize: 30, color: "#1479c4", marginBottom: 4 } as const,
  fecha: { color: "#6b7280", fontSize: 14, marginBottom: 28 } as const,
  h2: { fontSize: 20, marginTop: 32, marginBottom: 8, color: "#111827" } as const,
};

export default function PrivacidadPage() {
  return (
    <main style={S.wrap}>
      <h1 style={S.h1}>Política de Privacidad</h1>
      <p style={S.fecha}>Última actualización: 19 de noviembre de 2026</p>

      <p>
        Esta política describe cómo <strong>Benechito</strong> (benechito.com) y las
        herramientas internas de gestión y publicación de contenido operadas bajo la
        marca <strong>Panal</strong> (incluidas las aplicaciones registradas en Meta
        denominadas &ldquo;Panal Conector&rdquo;, &ldquo;Panal Publicador&rdquo; y
        &ldquo;Panal Social&rdquo;) tratan la información de las personas usuarias.
      </p>

      <h2 style={S.h2}>1. Quiénes somos</h2>
      <p>
        Benechito es una fábrica chilena de helados y dulces artesanales ubicada en
        Coronel, Región del Biobío, Chile. Panal es su área de herramientas digitales,
        dedicada a la gestión comercial y a la administración de publicaciones en redes
        sociales de marcas propias y de clientes que lo autorizan expresamente.
      </p>

      <h2 style={S.h2}>2. Qué información tratamos</h2>
      <p>
        <strong>En este sitio web:</strong> los datos de contacto que la persona nos
        entrega voluntariamente (por ejemplo, al escribirnos por WhatsApp) y datos
        operativos internos de nuestro sistema de gestión, accesibles solo para
        personal autorizado.
      </p>
      <p>
        <strong>En nuestras herramientas de publicación conectadas a Meta:</strong>{" "}
        cuando un administrador autoriza la conexión de sus páginas de Facebook o
        cuentas de Instagram, accedemos únicamente a: el nombre e identificador de las
        páginas o cuentas autorizadas, los permisos necesarios para programar y
        publicar contenido en ellas, y métricas básicas de las publicaciones. No
        accedemos a mensajes privados, listas de amigos ni datos de seguidores.
      </p>

      <h2 style={S.h2}>3. Para qué usamos la información</h2>
      <p>
        Exclusivamente para: (a) operar la gestión comercial interna de Benechito; (b)
        programar y publicar contenido en las páginas y cuentas sociales expresamente
        autorizadas por su administrador; y (c) revisar el rendimiento de esas
        publicaciones. Nunca vendemos, arrendamos ni compartimos información personal
        con terceros con fines publicitarios.
      </p>

      <h2 style={S.h2}>4. Dónde se almacena</h2>
      <p>
        La información se almacena en servidores privados contratados por nosotros
        (actualmente en Hostinger), protegidos con cifrado en tránsito (HTTPS) y acceso
        restringido por credenciales. Los tokens de acceso a redes sociales se guardan
        de forma segura y pueden revocarse en cualquier momento.
      </p>

      <h2 style={S.h2}>5. Eliminación de datos</h2>
      <p>
        Cualquier persona puede solicitar la eliminación de sus datos (incluidos los
        datos obtenidos a través de aplicaciones de Meta) escribiendo a{" "}
        <a href="mailto:xavirock.jc@gmail.com">xavirock.jc@gmail.com</a> con el asunto
        &ldquo;Eliminación de datos&rdquo;. Procesaremos la solicitud dentro de un
        plazo máximo de 30 días y confirmaremos por el mismo medio. También puedes
        revocar el acceso de nuestras aplicaciones desde la configuración de tu cuenta
        de Facebook o Instagram (Configuración → Apps y sitios web), lo que elimina
        nuestros accesos de inmediato.
      </p>

      <h2 style={S.h2}>6. Contacto</h2>
      <p>
        Para cualquier consulta sobre esta política: <br />
        Correo: <a href="mailto:xavirock.jc@gmail.com">xavirock.jc@gmail.com</a> <br />
        WhatsApp: +56 9 6581 3188 <br />
        Dirección: Río Salado 963, Coronel, Chile.
      </p>

      <h2 style={S.h2}>7. Cambios a esta política</h2>
      <p>
        Si esta política cambia, publicaremos la versión actualizada en esta misma
        página indicando la fecha de actualización.
      </p>
    </main>
  );
}
