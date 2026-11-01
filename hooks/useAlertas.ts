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

const COMBUSTIBLES_VALIDOS: readonly string[] = ["gasolina95", "gasolina98", "diesel", "glp"];

function esAlertaValida(a: unknown): a is AlertaConfig {
  if (!a || typeof a !== "object") return false;
  const o = a as Record<string, unknown>;
  return (
    typeof o.gasolineraId === "string" && o.gasolineraId.length > 0 &&
    typeof o.combustible === "string" && COMBUSTIBLES_VALIDOS.includes(o.combustible) &&
    typeof o.umbral === "number" && Number.isFinite(o.umbral)
  );
}

export function useAlertas() {
  const [alertas, setAlertas] = useState<AlertaConfig[]>([]);
  const [resumenDiario, setResumenDiarioState] = useState(false);

  useEffect(() => {
    // Dos try/catch separados: un valor corrupto en una clave no debe
    // impedir leer la otra. Un JSON.parse que no sea un array de alertas
    // válidas (null, objeto suelto, entradas sin los campos esperados) se
    // ignora para esta sesión sin tocar lo guardado.
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) setAlertas(parsed.filter(esAlertaValida));
      }
    } catch {}
    try {
      setResumenDiarioState(localStorage.getItem(RESUMEN_KEY) === "true");
    } catch {}
  }, []);

  // Igual que en favoritas/vehículo: un localStorage.setItem sin capturar
  // (cuota llena, modo privado, bloqueado...) rompía el render de toda la
  // app en vez de solo no persistir el cambio.
  const guardarAlerta = useCallback((alerta: AlertaConfig) => {
    setAlertas((prev) => {
      const next = [...prev.filter((a) => a.gasolineraId !== alerta.gasolineraId), alerta];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const eliminarAlerta = useCallback((gasolineraId: string) => {
    setAlertas((prev) => {
      const next = prev.filter((a) => a.gasolineraId !== gasolineraId);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const obtenerAlerta = useCallback(
    (gasolineraId: string) => alertas.find((a) => a.gasolineraId === gasolineraId) ?? null,
    [alertas]
  );

  const setResumenDiario = useCallback((v: boolean) => {
    setResumenDiarioState(v);
    try {
      localStorage.setItem(RESUMEN_KEY, String(v));
    } catch {}
  }, []);

  return { alertas, resumenDiario, guardarAlerta, eliminarAlerta, obtenerAlerta, setResumenDiario };
}
