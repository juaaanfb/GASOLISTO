"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CONSENT_EVENT, CONSENT_KEY, readAnalyticsConsent, type AnalyticsChoice } from "@/lib/analytics-consent";

export function AnalyticsConsent({ banner = false }: { banner?: boolean }) {
  const [choice, setChoice] = useState<AnalyticsChoice | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    setChoice(readAnalyticsConsent());
    setReady(true);
  }, []);

  function choose(next: AnalyticsChoice) {
    try {
      localStorage.setItem(CONSENT_KEY, next);
      setChoice(next);
      window.dispatchEvent(new Event(CONSENT_EVENT));
      // Reload tears down SDK timers and pending retries when consent changes.
      window.location.reload();
    } catch {
      setError(true);
    }
  }

  if (!ready || (banner && choice !== null)) return null;
  return (
    <section aria-label="Preferencias de analítica" className={banner
      ? "fixed bottom-24 right-4 left-4 sm:left-auto sm:w-[420px] z-[110] bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-sm text-gray-700"
      : "border-t border-gray-200 pt-5 text-sm text-gray-700"}>
      <h2 className="font-semibold text-gray-900 mb-2">Analítica opcional</h2>
      <p>¿Nos permites medir visitas y uso con PostHog y Vercel? La web funciona igual si rechazas.</p>
      {!banner && <p className="mt-2" role="status">Estado: {choice === "accepted" ? "aceptada" : choice === "rejected" ? "rechazada" : "sin elegir"}.</p>}
      <div className="flex gap-3 mt-3">
        <button type="button" onClick={() => choose("rejected")} className="flex-1 border border-gray-300 rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-50">Rechazar analítica</button>
        <button type="button" onClick={() => choose("accepted")} className="flex-1 border border-gray-300 rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-50">Aceptar analítica</button>
      </div>
      {banner && <Link href="/privacidad" className="inline-block mt-3 text-green-700 underline">Privacidad y cambiar elección</Link>}
      {error && <p role="alert" className="mt-2 text-red-700">No se ha podido guardar la elección. Tu preferencia anterior no ha cambiado.</p>}
    </section>
  );
}
