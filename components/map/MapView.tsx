"use client";
import { useEffect, useRef } from "react";
import type { Gasolinera, TipoCombustible, Coordenadas } from "@/types";
import { obtenerPrecio, calcularEstadisticas, clasificarPrecio } from "@/lib/calculos";

interface MapViewProps {
  gasolineras: Gasolinera[];
  combustible: TipoCombustible;
  centro: Coordenadas;
  seleccionadaId: string | null;
  activo: boolean;
  visible: boolean;
  onSelect: (gasolinera: Gasolinera) => void;
}

const COLOR_PRECIO = {
  barato: "#16a34a",
  medio: "#d97706",
  caro: "#ef4444",
};

export function MapView({ gasolineras, combustible, centro, seleccionadaId, activo, visible, onSelect }: MapViewProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<import("leaflet").Map | null>(null);
  const marcadoresRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const pinUsuarioRef = useRef<import("leaflet").Marker | null>(null);
  // Ref para que el closure de cada marcador siempre llame a la versión actual de onSelect
  // sin necesitar onSelect como dep del useEffect de marcadores (evita recrear todos los pines)
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  // Inicializar mapa UNA SOLA VEZ
  useEffect(() => {
    if (!contenedorRef.current) return;

    // Limpiar cualquier instancia previa que Leaflet haya dejado en el div
    // (necesario por React Strict Mode que monta/desmonta/remonta en dev)
    const contenedor = contenedorRef.current as HTMLDivElement & { _leaflet_id?: number };
    if (contenedor._leaflet_id) {
      mapaRef.current?.remove();
      mapaRef.current = null;
      pinUsuarioRef.current = null;
      delete contenedor._leaflet_id;
    }

    if (mapaRef.current) return;

    const init = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (!contenedorRef.current || mapaRef.current) return;

      const mapa = L.map(contenedorRef.current, {
        center: [centro.lat, centro.lng],
        zoom: 13,
        zoomControl: false,
      });

      L.control.zoom({ position: "bottomright" }).addTo(mapa);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapa);

      const iconoUsuario = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 3px rgba(37,99,235,0.3)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: "",
      });

      pinUsuarioRef.current = L.marker([centro.lat, centro.lng], {
        icon: iconoUsuario,
        zIndexOffset: 1000,
      }).addTo(mapa);

      mapaRef.current = mapa;
    };

    init();

    return () => {
      mapaRef.current?.remove();
      mapaRef.current = null;
      pinUsuarioRef.current = null;
    };
  }, []); // eslint-disable-line

  // Reparar tiles cuando el mapa vuelve a ser visible (BottomSheet cierra o cambia tamaño)
  useEffect(() => {
    if (!activo) return;
    const t = setTimeout(() => {
      mapaRef.current?.invalidateSize({ animate: false });
    }, 350);
    return () => clearTimeout(t);
  }, [activo]);

  // Mover el pin de usuario y reclinar el mapa cuando la geolocalización responde
  useEffect(() => {
    if (!mapaRef.current || !pinUsuarioRef.current) return;
    pinUsuarioRef.current.setLatLng([centro.lat, centro.lng]);
    mapaRef.current.setView([centro.lat, centro.lng], 13, { animate: true });
  }, [centro]);

  // Recrear marcadores solo cuando cambian gasolineras, combustible o selección
  // onSelect queda FUERA de deps porque se accede siempre via onSelectRef.current
  useEffect(() => {
    const init = async () => {
      if (!mapaRef.current) return;
      const L = (await import("leaflet")).default;
      const stats = calcularEstadisticas(gasolineras, combustible);

      marcadoresRef.current.forEach((m) => m.remove());
      marcadoresRef.current.clear();

      gasolineras.forEach((g) => {
        const precio = obtenerPrecio(g, combustible);
        if (!precio) return;

        const clasificacion = clasificarPrecio(precio, stats);
        const color = COLOR_PRECIO[clasificacion];
        const esSeleccionada = g.id === seleccionadaId;

        const icono = L.divIcon({
          html: `<div style="background:${color};color:white;font-size:11px;font-weight:700;padding:3px 6px;border-radius:8px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:2px solid ${esSeleccionada ? "white" : "transparent"};transform:${esSeleccionada ? "scale(1.15)" : "scale(1)"};transition:transform 0.15s;">${precio.toFixed(3)}</div>`,
          iconAnchor: [24, 16],
          className: "",
        });

        const tooltip = L.tooltip({
          permanent: false,
          direction: "top",
          offset: [0, -8],
          className: "gasolisto-tooltip",
        }).setContent(`
          <div style="font-family:system-ui;min-width:160px;padding:2px 0">
            <div style="font-weight:600;font-size:13px;color:#111;
                        margin-bottom:4px;white-space:nowrap;overflow:hidden;
                        text-overflow:ellipsis;max-width:180px">
              ${g.nombre}
            </div>
            <div style="font-size:11px;color:#666;margin-bottom:6px">
              ${g.localidad}
            </div>
            <div style="display:flex;align-items:center;
                        justify-content:space-between;gap:12px">
              <span style="font-size:18px;font-weight:700;color:${color}">
                ${precio.toFixed(3)}€
              </span>
              <span style="font-size:11px;background:${color}26;
                           color:${color};padding:2px 8px;border-radius:20px;
                           font-weight:500">
                ${clasificacion === "barato" ? "Barato" :
                  clasificacion === "medio" ? "Precio medio" : "Caro"}
              </span>
            </div>
          </div>
        `);

        const marcador = L.marker([g.latitud, g.longitud], { icon: icono })
          .addTo(mapaRef.current!)
          .bindTooltip(tooltip)
          .on("click", () => onSelectRef.current(g));

        marcadoresRef.current.set(g.id, marcador);
      });
    };

    init();
  }, [gasolineras, combustible, seleccionadaId]); // onSelect excluido — accedido via ref

  // Centrar vista en gasolinera seleccionada
  useEffect(() => {
    if (!seleccionadaId || !mapaRef.current) return;
    const g = gasolineras.find((x) => x.id === seleccionadaId);
    if (g) mapaRef.current.setView([g.latitud, g.longitud], 15, { animate: true });
  }, [seleccionadaId, gasolineras]);

  return (
    <div
      ref={contenedorRef}
      className="w-full h-full"
      style={{
        minHeight: "300px",
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? "auto" : "none",
      }}
    />
  );
}
