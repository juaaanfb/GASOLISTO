"use client";
import { useEffect, useRef } from "react";
import type { Gasolinera, TipoCombustible, Coordenadas } from "@/types";
import { obtenerPrecio, calcularEstadisticas, clasificarPrecio } from "@/lib/calculos";

interface MapViewProps {
  gasolineras: Gasolinera[];
  combustible: TipoCombustible;
  centro: Coordenadas;
  // Posición real del usuario (pin azul). Puede no coincidir con "centro":
  // al buscar una ciudad, el mapa se centra ahí pero el pin de "tú estás
  // aquí" no debe saltar a esa ciudad. null = sin ubicación real conocida
  // (permiso denegado o fallback interno) → no se dibuja el pin.
  ubicacionUsuario: Coordenadas | null;
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

function crearIconoPrecio(L: typeof import("leaflet"), precio: number, color: string, esSeleccionada: boolean) {
  return L.divIcon({
    html: `<div style="background:${color};color:white;font-size:11px;font-weight:700;padding:3px 6px;border-radius:8px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:2px solid ${esSeleccionada ? "white" : "transparent"};transform:${esSeleccionada ? "scale(1.15)" : "scale(1)"};transition:transform 0.15s;">${precio.toFixed(3)}</div>`,
    iconAnchor: [24, 16],
    className: "",
  });
}

// Los marcadores son <div> (L.divIcon), no <img>, así que Leaflet no les
// pone ningún nombre accesible por defecto: un lector de pantalla los
// anunciaba solo por su texto visible ("1.699"). Con role+aria-label el
// marcador se anuncia como "Repsol, Madrid, 1,699 euros por litro".
function aplicarAccesibilidadMarcador(
  marcador: import("leaflet").Marker,
  gasolinera: Gasolinera,
  precio: number,
  onSelect: (g: Gasolinera) => void
) {
  const el = marcador.getElement();
  if (!el) return;
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  el.setAttribute("aria-label", `${gasolinera.nombre}, ${gasolinera.localidad}, ${precio.toFixed(3)} euros por litro`);
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(gasolinera);
    }
  });
}

export function MapView({ gasolineras, combustible, centro, ubicacionUsuario, seleccionadaId, activo, visible, onSelect }: MapViewProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<import("leaflet").Map | null>(null);
  const marcadoresRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  // Precio/color de cada marcador, para poder recalcular solo su icono al
  // (de)seleccionarlo sin tener que reconstruir los demás (ver efecto de
  // seleccionadaId más abajo).
  const datosMarcadorRef = useRef<Map<string, { precio: number; color: string; gasolinera: Gasolinera }>>(new Map());
  const seleccionadaAnteriorRef = useRef<string | null>(null);
  const pinUsuarioRef = useRef<import("leaflet").Marker | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  // Ref para que el closure de cada marcador siempre llame a la versión actual de onSelect
  // sin necesitar onSelect como dep del useEffect de marcadores (evita recrear todos los pines)
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  // Mismo motivo: el efecto de reconstrucción de marcadores lee la selección
  // actual al crear cada icono, pero seleccionadaId no debe estar en sus
  // deps (ver más abajo), así que se lee vía ref.
  const seleccionadaIdRef = useRef(seleccionadaId);
  useEffect(() => { seleccionadaIdRef.current = seleccionadaId; }, [seleccionadaId]);
  // El efecto de inicialización solo corre una vez, así que lee el valor
  // inicial de ubicacionUsuario vía ref para decidir si crea el pin o no.
  const ubicacionUsuarioRef = useRef(ubicacionUsuario);
  useEffect(() => { ubicacionUsuarioRef.current = ubicacionUsuario; }, [ubicacionUsuario]);

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

      // El pin solo se crea si ya hay ubicación real conocida en este
      // primer render; si llega más tarde (o al buscar/limpiar una zona),
      // el efecto dedicado a ubicacionUsuario más abajo lo crea/mueve/quita.
      if (ubicacionUsuarioRef.current) {
        const iconoUsuario = L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 3px rgba(37,99,235,0.3)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          className: "",
        });

        pinUsuarioRef.current = L.marker(
          [ubicacionUsuarioRef.current.lat, ubicacionUsuarioRef.current.lng],
          { icon: iconoUsuario, zIndexOffset: 1000 }
        ).addTo(mapa);
      }

      mapaRef.current = mapa;

      // Repara los tiles cuando el contenedor cambia de tamaño real (al
      // volver de la Lista, rotar el móvil, etc.). Antes esto dependía de
      // un setTimeout fijo de 350ms tras cambiar de pestaña: si la
      // transición del móvil tardaba más que eso (dispositivo lento,
      // animación del BottomSheet), invalidateSize() se ejecutaba con el
      // contenedor todavía en su tamaño intermedio y el mapa se quedaba
      // con medidas internas erróneas hasta recargar la página.
      const observer = new ResizeObserver(() => {
        mapaRef.current?.invalidateSize({ animate: false });
      });
      observer.observe(contenedorRef.current!);
      resizeObserverRef.current = observer;
    };

    init();

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      mapaRef.current?.remove();
      mapaRef.current = null;
      pinUsuarioRef.current = null;
    };
  }, []); // eslint-disable-line

  // Empujón inmediato al volver a la vista de mapa: el ResizeObserver ya
  // cubre el caso general, pero esto evita un frame con tiles a medio
  // cargar mientras el observer aún no ha disparado.
  useEffect(() => {
    if (!activo) return;
    mapaRef.current?.invalidateSize({ animate: false });
  }, [activo]);

  // Reclinar el mapa cuando cambia el centro (geolocalización, zona
  // buscada o al limpiarla). Independiente del pin de usuario: centrar en
  // una ciudad buscada no debe mover el pin de "tú estás aquí".
  useEffect(() => {
    if (!mapaRef.current) return;
    mapaRef.current.setView([centro.lat, centro.lng], 13, { animate: true });
  }, [centro]);

  // Crea, mueve o quita el pin de ubicación real del usuario según llega,
  // cambia o se pierde (p.ej. al buscar una zona ya no representa "aquí").
  useEffect(() => {
    if (!mapaRef.current) return;

    if (!ubicacionUsuario) {
      pinUsuarioRef.current?.remove();
      pinUsuarioRef.current = null;
      return;
    }

    if (pinUsuarioRef.current) {
      pinUsuarioRef.current.setLatLng([ubicacionUsuario.lat, ubicacionUsuario.lng]);
      return;
    }

    import("leaflet").then((mod) => {
      const L = mod.default;
      if (!mapaRef.current || pinUsuarioRef.current) return;
      const iconoUsuario = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 3px rgba(37,99,235,0.3)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: "",
      });
      pinUsuarioRef.current = L.marker(
        [ubicacionUsuario.lat, ubicacionUsuario.lng],
        { icon: iconoUsuario, zIndexOffset: 1000 }
      ).addTo(mapaRef.current);
    });
  }, [ubicacionUsuario]);

  // Recrear marcadores solo cuando cambian gasolineras o combustible.
  // seleccionadaId y onSelect quedan FUERA de deps a propósito: seleccionar
  // una gasolinera no debe reconstruir los ~300 marcadores del mapa entero
  // (eso es lo que hacía que tocar una gasolinera fuera lento), y onSelect
  // se accede siempre vía onSelectRef.current.
  useEffect(() => {
    const init = async () => {
      if (!mapaRef.current) return;
      const L = (await import("leaflet")).default;
      const stats = calcularEstadisticas(gasolineras, combustible);

      marcadoresRef.current.forEach((m) => m.remove());
      marcadoresRef.current.clear();
      datosMarcadorRef.current.clear();

      gasolineras.forEach((g) => {
        const precio = obtenerPrecio(g, combustible);
        if (!precio) return;

        const clasificacion = clasificarPrecio(precio, stats);
        const color = COLOR_PRECIO[clasificacion];
        const esSeleccionada = g.id === seleccionadaIdRef.current;

        const icono = crearIconoPrecio(L, precio, color, esSeleccionada);
        datosMarcadorRef.current.set(g.id, { precio, color, gasolinera: g });

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

        aplicarAccesibilidadMarcador(marcador, g, precio, (sel) => onSelectRef.current(sel));

        marcadoresRef.current.set(g.id, marcador);
      });
    };

    init();
  }, [gasolineras, combustible]); // seleccionadaId/onSelect excluidos — accedidos vía ref

  // Actualiza solo el icono de la gasolinera antes y ahora seleccionadas
  // (en vez de reconstruir los ~300 marcadores del mapa por cada toque).
  useEffect(() => {
    const anterior = seleccionadaAnteriorRef.current;
    if (anterior === seleccionadaId) return;

    const actualizarIcono = async (id: string | null, seleccionada: boolean) => {
      if (!id) return;
      const marcador = marcadoresRef.current.get(id);
      const datos = datosMarcadorRef.current.get(id);
      if (!marcador || !datos) return;
      const L = (await import("leaflet")).default;
      marcador.setIcon(crearIconoPrecio(L, datos.precio, datos.color, seleccionada));
      // setIcon crea un <div> nuevo: hay que reaplicar el aria-label y el
      // manejador de teclado, que vivían en el nodo anterior.
      aplicarAccesibilidadMarcador(marcador, datos.gasolinera, datos.precio, (sel) => onSelectRef.current(sel));
    };

    actualizarIcono(anterior, false);
    actualizarIcono(seleccionadaId, true);
    seleccionadaAnteriorRef.current = seleccionadaId;
  }, [seleccionadaId]);

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
