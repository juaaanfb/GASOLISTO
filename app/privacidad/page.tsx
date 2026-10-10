import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacidad — Gasolisto",
  description: "Qué datos usa Gasolisto y qué hacemos (y qué no hacemos) con ellos.",
  // Sin esto, esta página heredaba el canonical "/" del layout raíz y se
  // autodeclaraba duplicado de la home.
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-5 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Gasolisto
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Privacidad</h1>
        <p className="text-sm text-gray-400 mb-8">
          Qué datos utiliza la app y qué servicios intervienen. Actualizado el 10 de octubre de 2026.
        </p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-semibold text-gray-900 mb-1.5">Sin cuenta para usar la app</h2>
            <p>
              No necesitas registrarte ni facilitar un email para comparar precios.
              Eso no significa que la navegación sea completamente anónima: los
              proveedores que sirven la web y sus funciones reciben datos técnicos,
              como la dirección IP, y la analítica utiliza identificadores de navegador.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1.5">Ubicación</h2>
            <p>
              Si das permiso, el navegador obtiene tu ubicación y la app calcula
              distancias aproximadas a las gasolineras en tu dispositivo. Puedes
              buscar una ciudad sin compartir ubicación. Madrid solo es la referencia
              inicial cuando no hay una ubicación disponible ni una ciudad elegida.
              Al buscar direcciones, Photon recibe el texto de la consulta y, cuando
              se usa para orientar resultados, unas coordenadas de referencia.
              Al calcular un viaje, OSRM recibe las coordenadas de origen y destino.
              Si abres la navegación externa, Google Maps o Apple Maps reciben los
              puntos incluidos en el enlace. Estos servicios aplican sus propias políticas.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1.5">
              Vehículos, favoritas y alertas
            </h2>
            <p>
              La configuración de vehículos, favoritas, descuentos y alertas se
              guarda en el almacenamiento local del navegador, sin una cuenta de
              sincronización en Gasolisto. Estos datos
              desaparecen si borras los datos del navegador o cambias de dispositivo.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1.5">Analíticas</h2>
            <p>
              Usamos Vercel Web Analytics para estadísticas agregadas de visitas,
              páginas, referentes y dispositivos. Según su documentación, no utiliza
              cookies de terceros para esta medición.
            </p>
            <p className="mt-2">
              También usamos PostHog para entender qué funciones se utilizan y
              detectar dificultades: páginas visitadas, interacciones y eventos como
              seleccionar una ciudad, abrir una gasolinera o calcular un viaje.
              Su SDK puede guardar identificadores en cookies y almacenamiento del
              navegador y asociar varias acciones a una visita o navegador. No es lo
              mismo que conocer tu nombre, pero tampoco garantiza anonimato absoluto.
              Los eventos de producto que definimos evitan coordenadas exactas y
              textos completos de búsquedas; esta limitación no describe todos los
              datos técnicos que pueden recoger los SDK o los servicios externos.
            </p>
            <p className="mt-2">
              Más información en la{" "}
              <a href="https://vercel.com/docs/analytics/privacy-policy" className="text-green-700 underline">documentación de Vercel</a>
              {" "}y la{" "}
              <a href="https://posthog.com/privacy" className="text-green-700 underline">política de PostHog</a>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1.5">Servicios externos</h2>
            <p className="mb-2">
              Gasolisto funciona apoyándose en servicios públicos externos. Cuando los
              usas, tu consulta llega a ellos igual que llegaría si los usaras
              directamente:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Ministerio para la Transición Ecológica (MITECO) — precios de carburantes.</li>
              <li>OpenStreetMap — imágenes del mapa solicitado desde el navegador. Leaflet es la biblioteca que lo muestra.</li>
              <li>OSRM — cálculo de rutas.</li>
              <li>Photon — búsqueda de ciudades y direcciones.</li>
              <li>Vercel — alojamiento de la web y estadísticas de visitas.</li>
              <li>PostHog — analítica de uso de las funciones.</li>
              <li>Google Maps o Apple Maps — navegación cuando abres sus enlaces.</li>
              <li>Google Forms — el cuestionario de feedback, que se abre fuera de Gasolisto.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1.5">Feedback y contacto</h2>
            <p>
              Si rellenas el cuestionario o nos escribes, recibimos la información
              que decidas enviar. Evita incluir datos sensibles en los comentarios.
              Para consultas sobre tus datos puedes escribir a{" "}
              <a href="mailto:contacto.gasolisto@gmail.com" className="text-green-700 underline">contacto.gasolisto@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1.5">Cambios</h2>
            <p>
              Si esto cambia alguna vez (por ejemplo, si añadimos alguna función que
              use datos de forma distinta), actualizaremos esta página.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
