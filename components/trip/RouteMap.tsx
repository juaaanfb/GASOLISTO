"use client";
import { useEffect, useRef } from "react";
import type { Coordenadas } from "@/types";
import type { ParadaRepostaje } from "@/types/trip";

interface RouteMapProps {
  origen: Coordenadas;
  destino: Coordenadas;
  rutaCoordenadas: Coordenadas[];
  paradas: ParadaRepostaje[];
}

export function RouteMap({ origen, destino, rutaCoordenadas, paradas }: RouteMapProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    if (!contenedorRef.current) return;

    const contenedor = contenedorRef.current as HTMLDivElement & { _leaflet_id?: number };
    if (contenedor._leaflet_id) {
      mapaRef.current?.remove();
      mapaRef.current = null;
      delete contenedor._leaflet_id;
    }
    if (mapaRef.current) return;

    const init = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (!contenedorRef.current || mapaRef.current) return;

      const mapa = L.map(contenedorRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapa);

      // Ruta
      const latlngs = rutaCoordenadas.map((c) => [c.lat, c.lng] as [number, number]);
      L.polyline(latlngs, { color: "#2563eb", weight: 4, opacity: 0.8 }).addTo(mapa);

      // Origen (verde)
      L.marker([origen.lat, origen.lng], {
        icon: L.divIcon({
          html: `<div style="width:13px;height:13px;border-radius:50%;background:#16a34a;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
          iconSize: [13, 13], iconAnchor: [6, 6], className: "",
        }),
      }).addTo(mapa);

      // Destino (rojo)
      L.marker([destino.lat, destino.lng], {
        icon: L.divIcon({
          html: `<div style="width:13px;height:13px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
          iconSize: [13, 13], iconAnchor: [6, 6], className: "",
        }),
      }).addTo(mapa);

      // Paradas (ámbar numeradas)
      paradas.forEach((parada, i) => {
        L.marker([parada.gasolinera.latitud, parada.gasolinera.longitud], {
          icon: L.divIcon({
            html: `<div style="background:#d97706;color:white;font-size:11px;font-weight:700;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)">${i + 1}</div>`,
            iconSize: [22, 22], iconAnchor: [11, 11], className: "",
          }),
        })
          .addTo(mapa)
          .bindTooltip(`${parada.gasolinera.nombre} · ${parada.gasolinera.localidad}`, { direction: "top" });
      });

      // Ajustar vista al total de la ruta
      const puntos: [number, number][] = [
        [origen.lat, origen.lng],
        [destino.lat, destino.lng],
        ...rutaCoordenadas.map((c) => [c.lat, c.lng] as [number, number]),
      ];
      mapa.fitBounds(L.latLngBounds(puntos), { padding: [24, 24] });

      mapaRef.current = mapa;
    };

    init();

    return () => {
      mapaRef.current?.remove();
      mapaRef.current = null;
    };
  }, []); // eslint-disable-line

  return <div ref={contenedorRef} className="w-full h-full" style={{ minHeight: "240px" }} />;
}
