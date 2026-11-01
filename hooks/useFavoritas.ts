"use client";
import { useState, useCallback, useEffect } from "react";

const KEY = "gasolisto_favoritas";

export function useFavoritas() {
  const [favoritas, setFavoritas] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      // Un valor guardado con otra forma (null, objeto, array con algo que
      // no sea un id de texto...) no es una lista de favoritas utilizable:
      // se ignora para esta sesión sin tocar lo que haya en localStorage.
      if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) {
        setFavoritas(new Set(parsed));
      }
    } catch {}
  }, []);

  const toggleFavorita = useCallback((id: string) => {
    setFavoritas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // Si el almacenamiento falla (cuota llena, modo privado, bloqueado...)
      // la favorita se mantiene en memoria para esta sesión; sin este
      // try/catch, el error no capturado rompía todo el render de la app.
      try {
        localStorage.setItem(KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, []);

  return { favoritas, toggleFavorita };
}
