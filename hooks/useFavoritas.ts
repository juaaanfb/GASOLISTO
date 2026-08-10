"use client";
import { useState, useCallback, useEffect } from "react";

const KEY = "gasolisto_favoritas";

export function useFavoritas() {
  const [favoritas, setFavoritas] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setFavoritas(new Set(JSON.parse(stored) as string[]));
    } catch {}
  }, []);

  const toggleFavorita = useCallback((id: string) => {
    setFavoritas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  return { favoritas, toggleFavorita };
}
