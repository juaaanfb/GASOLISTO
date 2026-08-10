"use client";
import { useState, useCallback, useEffect } from "react";
import type { TipoCombustible } from "@/types";

export interface AlertaConfig {
  gasolineraId: string;
  combustible: TipoCombustible;
  umbral: number;
}

const KEY = "gasolisto_alertas";
const RESUMEN_KEY = "gasolisto_resumen_diario";

export function useAlertas() {
  const [alertas, setAlertas] = useState<AlertaConfig[]>([]);
  const [resumenDiario, setResumenDiarioState] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setAlertas(JSON.parse(stored) as AlertaConfig[]);
      setResumenDiarioState(localStorage.getItem(RESUMEN_KEY) === "true");
    } catch {}
  }, []);

  const guardarAlerta = useCallback((alerta: AlertaConfig) => {
    setAlertas((prev) => {
      const next = [...prev.filter((a) => a.gasolineraId !== alerta.gasolineraId), alerta];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const eliminarAlerta = useCallback((gasolineraId: string) => {
    setAlertas((prev) => {
      const next = prev.filter((a) => a.gasolineraId !== gasolineraId);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const obtenerAlerta = useCallback(
    (gasolineraId: string) => alertas.find((a) => a.gasolineraId === gasolineraId) ?? null,
    [alertas]
  );

  const setResumenDiario = useCallback((v: boolean) => {
    setResumenDiarioState(v);
    localStorage.setItem(RESUMEN_KEY, String(v));
  }, []);

  return { alertas, resumenDiario, guardarAlerta, eliminarAlerta, obtenerAlerta, setResumenDiario };
}
