import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacidad — Gasolisto",
  description: "Qué datos usa Gasolisto y qué hacemos (y qué no hacemos) con ellos.",
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
          Resumen honesto de qué datos usa Gasolisto. Sin letra pequeña.
        </p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-semibold text-gray-900 mb-1.5">No hay cuentas ni datos personales</h2>
            <p>
              Gasolisto no pide registro, ni email, ni ningún dato personal. No sabemos
              quién eres y no hay forma de identificarte a partir del uso de la app.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1.5">Ubicación</h2>
            <p>
              Si das permiso, tu navegador usa tu ubicación para calcular distancias a
              gasolineras. Ese cálculo se hace en tu propio dispositivo — tu ubicación
              nunca se envía a nuestros servidores ni se guarda en ningún sitio. Si no
              das permiso, la app usa Madrid como punto de referencia.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1.5">
              Vehículos, favoritas y alertas
            </h2>
            <p>
              Se guardan solo en tu propio dispositivo (almacenamiento local del
              navegador). No los vemos, no los guardamos en ningún servidor, y
              desaparecen si borras los datos del navegador o cambias de dispositivo.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1.5">Analíticas</h2>
            <p>
              Usamos Vercel Web Analytics para ver cuánta gente visita la app. Son
              datos agregados y anónimos (número de visitas, país, página), sin
              cookies y sin identificar a ninguna persona en concreto.
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
              <li>OpenStreetMap / Leaflet — el mapa.</li>
              <li>OSRM — cálculo de rutas.</li>
              <li>Nominatim (OpenStreetMap) — búsqueda de direcciones al planificar un viaje.</li>
            </ul>
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
