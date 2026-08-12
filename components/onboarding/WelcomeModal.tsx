"use client";
import { useEffect, useState } from "react";
import { Map, Star, Bell, Car, Route, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const KEY = "gasolisto_onboarding_visto";

const FUNCIONES = [
  {
    Icon: Map,
    titulo: "Mapa y lista de precios",
    texto: "Precios reales de gasolineras cerca de ti, actualizados al momento.",
  },
  {
    Icon: Star,
    titulo: "Favoritas",
    texto: "Guarda tus gasolineras de confianza para verlas siempre primero.",
  },
  {
    Icon: Bell,
    titulo: "Alertas de precio",
    texto: "Te avisamos en cuanto una gasolinera baje del precio que tú marques.",
  },
  {
    Icon: Car,
    titulo: "Tu vehículo",
    texto: "Calculamos el ahorro real según el consumo y depósito de tu coche.",
  },
  {
    Icon: Route,
    titulo: "Planifica tu viaje",
    texto: "Encuentra dónde repostar más barato en trayectos largos.",
  },
];

export function useOnboarding() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {}
  }, []);

  const cerrar = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setVisible(false);
  };

  const abrir = () => setVisible(true);

  return { visible, cerrar, abrir };
}

interface WelcomeModalProps {
  onCerrar: () => void;
}

export function WelcomeModal({ onCerrar }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />

      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-card-hover max-h-[90vh] overflow-y-auto">
        <div className="p-5 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon-192.png" alt="" className="w-9 h-9 rounded-xl" />
            <div>
              <h2 className="font-bold text-gray-900 text-base leading-tight">
                Bienvenido a Gasolisto
              </h2>
              <p className="text-xs text-gray-400">Gratis, sin registro</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="p-1.5 -mr-1.5 -mt-1.5 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-5 pb-2 space-y-3.5">
          {FUNCIONES.map(({ Icon, titulo, texto }) => (
            <div key={titulo} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5 text-green-600" />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{titulo}</p>
                <p className="text-xs text-gray-500 leading-snug mt-0.5">{texto}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 pt-4">
          <Button variante="primario" className="w-full" onClick={onCerrar}>
            Empezar a ahorrar
          </Button>
        </div>
      </div>
    </div>
  );
}
