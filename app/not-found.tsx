import type { Metadata } from "next";
import Link from "next/link";
import { Fuel } from "lucide-react";

export const metadata: Metadata = {
  title: "Página no encontrada — Gasolisto",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="max-w-sm w-full text-center py-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-green-50 flex items-center justify-center">
          <Fuel className="w-6 h-6 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1.5">Esta página no existe</h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          El enlace puede estar roto o la página se ha movido. Desde Gasolisto puedes
          seguir buscando la gasolinera más barata cerca de ti.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          Volver a Gasolisto
        </Link>
      </div>
    </div>
  );
}
