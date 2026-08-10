"use client";
import { useState, useEffect, useMemo } from "react";
import type { Gasolinera, Filtros, Coordenadas } from "@/types";
import { filtrarPorRadio, obtenerPrecio, calcularEstadisticas } from "@/lib/calculos";

interface EstadoGasolineras {
  todas: Gasolinera[];
  filtradas: Gasolinera[];
  cargando: boolean;
  error: string | null;
  ultimaActualizacion: string | null;
  refetch: () => void;
}

export function useGasolineras(
  ubicacion: Coordenadas,
  filtros: Filtros
): EstadoGasolineras {
  const [todas, setTodas] = useState<Gasolinera[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);

    fetch("/api/gasolineras")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelado) return;
        if (!data.ok) throw new Error(data.error);
        setTodas(data.datos);
        if (data.datos.length > 0) {
          setUltimaActualizacion(data.datos[0].ultimaActualizacion);
        }
      })
      .catch((e: Error) => { if (!cancelado) setError(e.message); })
      .finally(() => { if (!cancelado) setCargando(false); });

    return () => { cancelado = true; };
  }, [trigger]); // trigger permite refetch manual

  const refetch = () => setTrigger((t) => t + 1);

  // MEMO 1: distancias — no depende del combustible
  // Cambiar combustible ya no recalcula las 11.000+ distancias Haversine
  const conDistancia = useMemo(
    () => filtrarPorRadio(todas, ubicacion, filtros.radio),
    [todas, ubicacion, filtros.radio]
  );

  // MEMO 2: filtrar por precio del combustible seleccionado y ordenar
  const filtradas = useMemo(() => {
    if (conDistancia.length === 0) return [];
    const conPrecio = conDistancia.filter(
      (g) => obtenerPrecio(g, filtros.combustible) !== undefined
    );
    return [...conPrecio].sort((a, b) => {
      const pa = obtenerPrecio(a, filtros.combustible) ?? Infinity;
      const pb = obtenerPrecio(b, filtros.combustible) ?? Infinity;
      return pa - pb;
    });
  }, [conDistancia, filtros.combustible]);

  return { todas, filtradas, cargando, error, ultimaActualizacion, refetch };
}

export function useEstadisticas(gasolineras: Gasolinera[], filtros: Filtros) {
  return useMemo(
    () => calcularEstadisticas(gasolineras, filtros.combustible),
    [gasolineras, filtros.combustible]
  );
}
