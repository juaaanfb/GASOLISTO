"use client";
import { useState, useEffect } from "react";
import type { Coordenadas } from "@/types";

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
      setEstado({
        coordenadas: MADRID_CENTRO,
        cargando: false,
        error: "Geolocalización no disponible en este navegador",
        esFallback: true,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
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
        const mensajes: Record<number, string> = {
          1: "Permiso de ubicación denegado. Mostrando Madrid.",
          2: "No se pudo obtener tu ubicación. Mostrando Madrid.",
          3: "Tiempo de espera agotado. Mostrando Madrid.",
        };
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
