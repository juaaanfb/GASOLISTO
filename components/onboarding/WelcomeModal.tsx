"use client";
import { useEffect, useRef, useState } from "react";
import { Map, Star, Bell, Car, Percent, Route, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FEEDBACK_FORM_URL } from "@/lib/site";
import { track } from "@/lib/analytics";

const KEY = "gasolisto_onboarding_visto";

const FUNCIONES = [
  {
    Icon: Map,
    titulo: "Ubicación o busca tu ciudad",
    texto: "Permite ubicación o usa la lupa para comparar precios en cualquier zona de España.",
  },
  {
    Icon: Star,
    titulo: "Favoritas",
    texto: "Guarda tus estaciones de confianza y compáralas más rápido.",
  },
  {
    Icon: Bell,
    titulo: "Alertas de precio",
    // Sin esta salvedad se sugería un aviso en segundo plano que la app no
    // tiene (no hay push real sin service worker): la alerta solo se
    // comprueba mientras la tienes abierta, como ya se explica en el
    // detalle de cada gasolinera.
    texto: "Marca un precio objetivo y te avisamos en la app mientras la tengas abierta.",
  },
  {
    Icon: Car,
    titulo: "Ahorro real",
    texto: "Calcula euros por depósito según tu coche, consumo y distancia.",
  },
  {
    Icon: Percent,
    titulo: "Tus descuentos",
    texto: "Añade Waylet, Gow u otras tarjetas para ver tu precio final.",
  },
  {
    Icon: Route,
    titulo: "Planifica tu viaje",
    texto: "Encuentra paradas baratas en trayectos largos antes de salir.",
  },
];

export function useOnboarding() {
  const [visible, setVisible] = useState(false);
  // Foco antes de abrir, para devolverlo al cerrar (p.ej. el botón "Ayuda").
  const focoPrevioRef = useRef<HTMLElement | null>(null);

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
    focoPrevioRef.current?.focus();
  };

  const abrir = () => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      focoPrevioRef.current = document.activeElement;
    }
    setVisible(true);
  };

  return { visible, cerrar, abrir };
}

interface WelcomeModalProps {
  onCerrar: () => void;
}

export function WelcomeModal({ onCerrar }: WelcomeModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Foco inicial dentro del diálogo y atrapado en Tab/Shift+Tab mientras
  // esté abierto, para que el teclado no se escape a controles de fondo
  // tapados por el overlay. Escape cierra igual que el backdrop o la X.
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCerrar();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />

      <div
        ref={panelRef}
        className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-card-hover max-h-[90vh] overflow-y-auto"
      >
        <div className="p-5 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon-192.png" alt="" className="w-9 h-9 rounded-xl" />
            <div>
              <h2 id="welcome-modal-title" className="font-bold text-gray-900 text-base leading-tight">
                Bienvenido a Gasolisto
              </h2>
              <p className="text-xs text-gray-400">Ahorra al repostar, sin registro</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
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

        <div className="p-5 pt-4 space-y-3">
          <Button variante="primario" className="w-full" onClick={onCerrar}>
            Ver gasolineras cercanas
          </Button>
          <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
            <a href="/como-funciona" className="hover:text-gray-600 underline underline-offset-2">
              Cómo funciona
            </a>
            <span>·</span>
            <a
              href={FEEDBACK_FORM_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => track("feedback_opened", { surface: "welcome_modal" })}
              className="hover:text-gray-600 underline underline-offset-2"
            >
              Feedback
            </a>
            <span>·</span>
            <a href="/privacidad" className="hover:text-gray-600 underline underline-offset-2">
              Privacidad
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
