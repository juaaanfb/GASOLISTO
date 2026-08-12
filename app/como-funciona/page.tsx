import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Cómo funciona Gasolisto — Comparador de gasolina barata",
  description:
    "Cómo encuentra Gasolisto la gasolinera más barata cerca de ti, de dónde salen los precios, y cómo calcula cuánto puedes ahorrar en cada repostaje.",
};

const PREGUNTAS = [
  {
    pregunta: "¿Gasolisto es gratis?",
    respuesta:
      "Sí, completamente. Sin registro, sin cuenta, sin anuncios y sin límite de uso.",
  },
  {
    pregunta: "¿De dónde salen los precios?",
    respuesta:
      "De la API pública y oficial del Ministerio para la Transición Ecológica (MITECO), que publica los precios de todas las gasolineras de España. No usamos estimaciones ni datos de terceros.",
  },
  {
    pregunta: "¿Cada cuánto se actualizan los precios?",
    respuesta:
      "Gasolisto consulta la API oficial en tiempo real cada vez que abres la app, así que ves los mismos precios que publica el Ministerio en ese momento.",
  },
  {
    pregunta: "¿Necesito compartir mi ubicación?",
    respuesta:
      "Es opcional. Si la compartes, calculamos distancias reales a las gasolineras cercanas; el cálculo se hace en tu propio dispositivo, nunca se envía a ningún servidor. Si no la compartes, la app usa Madrid como referencia.",
  },
  {
    pregunta: "¿Cómo calcula el ahorro?",
    respuesta:
      "Compara el precio de cada gasolinera con el precio medio y máximo de las gasolineras de tu zona, y lo multiplica por la capacidad del depósito de tu vehículo, para darte una cifra real en euros, no solo en céntimos por litro.",
  },
  {
    pregunta: "¿Funciona en el móvil?",
    respuesta:
      "Sí. Es una PWA: puedes instalarla desde el navegador (\"Añadir a pantalla de inicio\") y se comporta como una aplicación normal, sin pasar por ninguna tienda de aplicaciones.",
  },
];

export default function ComoFuncionaPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PREGUNTAS.map((p) => ({
      "@type": "Question",
      name: p.pregunta,
      acceptedAnswer: { "@type": "Answer", text: p.respuesta },
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-lg mx-auto px-5 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Gasolisto
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Cómo funciona Gasolisto</h1>
        <p className="text-sm text-gray-400 mb-8">
          Comparador de precios de gasolina y diésel en España, gratis y sin registro.
        </p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed mb-10">
          <p>
            Cuando aparcas junto a una gasolinera nunca sabes si de verdad compensa
            desviarte a otra más barata que has visto de pasada. <strong>Gasolisto</strong>{" "}
            resuelve justo eso: te muestra los precios reales de gasolina 95, 98,
            diésel y GLP de las gasolineras cerca de ti, ordenados de más barata a más
            cara, y calcula cuánto ahorrarías de verdad al llenar tu depósito en cada
            una — no solo la diferencia de céntimos por litro.
          </p>
          <p>
            La app usa los datos oficiales del Ministerio para la Transición
            Ecológica, la misma fuente que usan las webs y apps grandes del sector,
            así que los precios que ves son reales y están actualizados. También
            incluye un planificador de viajes: si vas a hacer un trayecto largo, te
            dice dónde te conviene repostar por el camino según la autonomía de tu
            coche, y te abre la ruta directamente en Google Maps o Apple Maps.
          </p>
          <p>
            No hace falta registrarse. Tus vehículos, tus gasolineras favoritas y tus
            alertas de precio se guardan solo en tu propio móvil u ordenador — nunca en
            un servidor nuestro. Puedes instalar Gasolisto como si fuera una app
            normal desde el navegador, sin pasar por ninguna tienda de aplicaciones.
          </p>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-4">Preguntas frecuentes</h2>
        <div className="space-y-5">
          {PREGUNTAS.map((p) => (
            <div key={p.pregunta}>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{p.pregunta}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{p.respuesta}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
