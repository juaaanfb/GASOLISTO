"use client";
import { useState, useEffect, useCallback } from "react";
import { COMBUSTIBLES, type Vehiculo, type TipoCombustible } from "@/types";

const STORAGE_KEY = "gasolisto_vehiculos";
const ACTIVO_KEY = "gasolisto_vehiculo_activo";

const VEHICULO_DEFAULT: Vehiculo = {
  id: "default",
  nombre: "Coche estándar",
  combustible: "gasolina95",
  consumo: 6.5,
  deposito: 50,
};

// JSON.parse de un valor guardado por versiones futuras/externas puede
// devolver null, un número, un array vacío, objetos sin alguno de estos
// campos, etc. — nada de eso es un Vehiculo utilizable, y usarlo tal cual
// (p.ej. v.consumo en un cálculo) rompería el render en vez de solo
// ignorar esa entrada.
function esVehiculoValido(v: unknown): v is Vehiculo {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" && o.id.length > 0 &&
    typeof o.nombre === "string" &&
    typeof o.combustible === "string" && o.combustible in COMBUSTIBLES &&
    typeof o.consumo === "number" && Number.isFinite(o.consumo) &&
    typeof o.deposito === "number" && Number.isFinite(o.deposito)
  );
}

// Nunca borra ni reescribe lo guardado solo por encontrarlo inválido: una
// entrada corrupta o con forma inesperada se descarta para ESTA sesión
// (se usa el vehículo por defecto en memoria), pero el dato original en
// localStorage se deja intacto por si una versión futura puede leerlo.
function cargarVehiculos(): Vehiculo[] {
  if (typeof window === "undefined") return [VEHICULO_DEFAULT];
  try {
    const guardados = localStorage.getItem(STORAGE_KEY);
    if (!guardados) return [VEHICULO_DEFAULT];
    const parsed: unknown = JSON.parse(guardados);
    if (!Array.isArray(parsed)) return [VEHICULO_DEFAULT];
    const validos = parsed.filter(esVehiculoValido);
    return validos.length > 0 ? validos : [VEHICULO_DEFAULT];
  } catch {
    return [VEHICULO_DEFAULT];
  }
}

function cargarActivoId(): string {
  if (typeof window === "undefined") return "default";
  try {
    return localStorage.getItem(ACTIVO_KEY) ?? "default";
  } catch {
    return "default";
  }
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

  // Igual que al leer: si el almacenamiento falla (cuota llena, modo
  // privado, bloqueado...) el cambio se mantiene en memoria para esta
  // sesión en vez de dejar un error no capturado romper el render de toda
  // la app (p.ej. al guardar un vehículo o marcar una favorita).
  const guardarVehiculo = useCallback((vehiculo: Vehiculo) => {
    setVehiculos((prev) => {
      const existe = prev.findIndex((v) => v.id === vehiculo.id);
      const nuevos = existe >= 0
        ? prev.map((v) => (v.id === vehiculo.id ? vehiculo : v))
        : [...prev, vehiculo];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos));
      } catch {}
      return nuevos;
    });
  }, []);

  const eliminarVehiculo = useCallback((id: string) => {
    setVehiculos((prev) => {
      const nuevos = prev.filter((v) => v.id !== id);
      if (nuevos.length === 0) nuevos.push(VEHICULO_DEFAULT);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos));
      } catch {}
      if (activoId === id) {
        const nuevoActivo = nuevos[0].id;
        setActivoId(nuevoActivo);
        try {
          localStorage.setItem(ACTIVO_KEY, nuevoActivo);
        } catch {}
      }
      return nuevos;
    });
  }, [activoId]);

  const seleccionarVehiculo = useCallback((id: string) => {
    setActivoId(id);
    try {
      localStorage.setItem(ACTIVO_KEY, id);
    } catch {}
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
