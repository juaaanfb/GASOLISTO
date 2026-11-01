"use client";
import { useState, useEffect, useCallback } from "react";
import { MARCAS, type Marca } from "@/lib/marcas";

const KEY = "gasolisto_descuentos";
const MARCAS_VALIDAS: readonly string[] = MARCAS.map((m) => m.marca);

export type Descuentos = Partial<Record<Marca, number>>;

export function useDescuentos() {
  const [descuentos, setDescuentos] = useState<Descuentos>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      // Un valor guardado que no sea un objeto plano (null, array, string
      // suelto...) no es un mapa de descuentos utilizable; se ignora para
      // esta sesión. Si es un objeto, se conserva solo lo que tenga forma
      // de descuento real (marca conocida, número finito) — el resto de
      // claves se descarta sin reescribir lo guardado.
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const limpio: Descuentos = {};
        for (const [marca, valor] of Object.entries(parsed as Record<string, unknown>)) {
          if (MARCAS_VALIDAS.includes(marca) && typeof valor === "number" && Number.isFinite(valor)) {
            limpio[marca as Marca] = valor;
          }
        }
        setDescuentos(limpio);
      }
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
