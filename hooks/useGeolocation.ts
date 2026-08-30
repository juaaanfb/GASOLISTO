"use client";
import { useState, useEffect } from "react";
import type { Coordenadas } from "@/types";
import { track, bucketPrecisionGeo } from "@/lib/analytics";

// Madrid centro como fallback si el usuario deniega la geolocalización
const MADRID_CENTRO: Coordenadas = { lat: 40.4168, lng: -3.7038 };

interface EstadoGeolocalizacion {
  coordenadas: Coordenadas;
  cargando: boolean;
  error: string | null;
  esFallback: boolean;
}

export function useGeolocation(): EstadoGeolocalizacion {
  const [estado, setEstado] = useState<EstadoGeolocalizacion>({
    coordenadas: MADRID_CENTRO,
    cargando: true,
    error: null,
    esFallback: false,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      track("geolocation_denied", { reason: "unsupported" });
      setEstado({
        coordenadas: MADRID_CENTRO,
        cargando: false,
        error: "Geolocalización no disponible en este navegador",
        esFallback: true,
      });
      return;
    }

    track("geolocation_requested");

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        track("geolocation_allowed", {
          accuracy_bucket: bucketPrecisionGeo(posicion.coords.accuracy),
        });
        setEstado({
          coordenadas: {
            lat: posicion.coords.latitude,
            lng: posicion.coords.longitude,
          },
          cargando: false,
          error: null,
          esFallback: false,
        });
      },
      (err) => {
        // Sin mención a Madrid: es solo un fallback interno para tener un
        // centro válido, no el ámbito real de la app (cobertura nacional).
        const mensajes: Record<number, string> = {
          1: "Permiso de ubicación denegado.",
          2: "No se pudo obtener tu ubicación.",
          3: "Tiempo de espera agotado obteniendo tu ubicación.",
        };
        // "denied" cubre las tres causas (permiso, GPS sin señal, timeout):
        // de cara al embudo lo que importa es que no hubo ubicación real;
        // "reason" da el matiz para quien quiera diferenciar el motivo.
        const razones: Record<number, string> = {
          1: "permission_denied",
          2: "position_unavailable",
          3: "timeout",
        };
        track("geolocation_denied", { reason: razones[err.code] ?? "unknown" });
        setEstado({
          coordenadas: MADRID_CENTRO,
          cargando: false,
          error: mensajes[err.code] ?? "Error de geolocalización",
          esFallback: true,
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  return estado;
}
