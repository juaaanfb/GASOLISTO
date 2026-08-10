"use client";
import { useState, useEffect, useCallback } from "react";
import type { Vehiculo, TipoCombustible } from "@/types";

const STORAGE_KEY = "gasolisto_vehiculos";
const ACTIVO_KEY = "gasolisto_vehiculo_activo";

const VEHICULO_DEFAULT: Vehiculo = {
  id: "default",
  nombre: "vehículo",
  combustible: "gasolina95",
  consumo: 6.5,
  deposito: 50,
};

function cargarVehiculos(): Vehiculo[] {
  if (typeof window === "undefined") return [VEHICULO_DEFAULT];
  try {
    const guardados = localStorage.getItem(STORAGE_KEY);
    if (!guardados) return [VEHICULO_DEFAULT];
    return JSON.parse(guardados);
  } catch {
    return [VEHICULO_DEFAULT];
  }
}

function cargarActivoId(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(ACTIVO_KEY) ?? "default";
}

export function useVehiculo() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([VEHICULO_DEFAULT]);
  const [activoId, setActivoId] = useState<string>("default");
  const [hidratado, setHidratado] = useState(false);

  // Carga desde localStorage solo en el cliente (evita hidratación SSR)
  useEffect(() => {
    setVehiculos(cargarVehiculos());
    setActivoId(cargarActivoId());
    setHidratado(true);
  }, []);

  const vehiculoActivo = vehiculos.find((v) => v.id === activoId) ?? vehiculos[0];

  const guardarVehiculo = useCallback((vehiculo: Vehiculo) => {
    setVehiculos((prev) => {
      const existe = prev.findIndex((v) => v.id === vehiculo.id);
      const nuevos = existe >= 0
        ? prev.map((v) => (v.id === vehiculo.id ? vehiculo : v))
        : [...prev, vehiculo];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos));
      return nuevos;
    });
  }, []);

  const eliminarVehiculo = useCallback((id: string) => {
    setVehiculos((prev) => {
      const nuevos = prev.filter((v) => v.id !== id);
      if (nuevos.length === 0) nuevos.push(VEHICULO_DEFAULT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos));
      if (activoId === id) {
        const nuevoActivo = nuevos[0].id;
        setActivoId(nuevoActivo);
        localStorage.setItem(ACTIVO_KEY, nuevoActivo);
      }
      return nuevos;
    });
  }, [activoId]);

  const seleccionarVehiculo = useCallback((id: string) => {
    setActivoId(id);
    localStorage.setItem(ACTIVO_KEY, id);
  }, []);

  const crearVehiculo = useCallback((): Vehiculo => ({
    id: `v_${Date.now()}`,
    nombre: "Nuevo vehículo",
    combustible: "gasolina95" as TipoCombustible,
    consumo: 6.5,
    deposito: 50,
  }), []);

  return {
    vehiculos,
    vehiculoActivo,
    guardarVehiculo,
    eliminarVehiculo,
    seleccionarVehiculo,
    crearVehiculo,
    hidratado,
  };
}
