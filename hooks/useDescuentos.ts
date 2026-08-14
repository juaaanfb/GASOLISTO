"use client";
import { useState, useEffect, useCallback } from "react";
import type { Marca } from "@/lib/marcas";

const KEY = "gasolisto_descuentos";

export type Descuentos = Partial<Record<Marca, number>>;

export function useDescuentos() {
  const [descuentos, setDescuentos] = useState<Descuentos>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setDescuentos(JSON.parse(stored));
    } catch {}
  }, []);

  const guardar = useCallback((nuevo: Descuentos) => {
    setDescuentos(nuevo);
    try {
      localStorage.setItem(KEY, JSON.stringify(nuevo));
    } catch {}
  }, []);

  return { descuentos, guardar };
}
