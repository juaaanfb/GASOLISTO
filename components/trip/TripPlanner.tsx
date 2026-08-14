"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { MapPin, Navigation, Navigation2, ExternalLink, Car, Fuel, LocateFixed } from "lucide-react";
import type { Coordenadas, Gasolinera, Vehiculo, TipoCombustible } from "@/types";
import type { PlanViaje } from "@/types/trip";
import { planificarViaje, geocodificarDireccion } from "@/lib/routing";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { AutocompleteInput } from "@/components/trip/AutocompleteInput";
import type { LugarSugerido } from "@/lib/geocoding";
import { PROGRAMAS_DESCUENTO, type MarcaDescuento } from "@/lib/marcas";
import { cn } from "@/lib/utils";

function urlGoogleMaps(plan: PlanViaje): string {
  const coord = (c: Coordenadas) => `${c.lat},${c.lng}`;
  const params = new URLSearchParams({
    api: "1",
    origin: coord(plan.origen),
    destination: coord(plan.destinoCoordenadas),
    travelmode: "driving",
  });
  if (plan.paradas.length > 0) {
    params.set(
      "waypoints",
      plan.paradas
        .map((p) => `${p.gasolinera.latitud},${p.gasolinera.longitud}`)
        .join("|")
    );
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function urlAppleMaps(plan: PlanViaje): string {
  const { lat, lng } = plan.destinoCoordenadas;
  return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
}

const RouteMap = dynamic(
  () => import("@/components/trip/RouteMap").then((m) => m.RouteMap),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-100 animate-pulse" />,
  }
);

const ERRORES: Record<string, string> = {
  RUTA_CORTA: "La ruta es demasiado corta (mínimo 50 km).",
  NO_ENCONTRADO: "No se encontró ese destino. Prueba con otra dirección.",
  ORIGEN_NO_ENCONTRADO: "No se encontró el origen. Prueba con otra dirección.",
  SIN_GASOLINERAS: "No hay gasolineras con ese combustible en la ruta.",
  RUTA_NO_ENCONTRADA: "No se pudo calcular la ruta. Verifica el destino.",
  GEOCODING_ERROR: "Error al buscar la dirección. Inténtalo de nuevo.",
  OSRM_ERROR: "Error al calcular la ruta. Inténtalo de nuevo.",
};

interface TripPlannerProps {
  coordenadas: Coordenadas;
  todasGasolineras: Gasolinera[];
  vehiculo: Vehiculo | undefined;
  combustible: TipoCombustible;
  onAbrirVehiculos: () => void;
}

export function TripPlanner({
  coordenadas,
  todasGasolineras,
  vehiculo,
  combustible,
  onAbrirVehiculos,
}: TripPlannerProps) {
  const [origenTexto, setOrigenTexto] = useState("");
  const [destinoTexto, setDestinoTexto] = useState("");
  const [destinoCoords, setDestinoCoords] = useState<Coordenadas | null>(null);
  const [marcaPreferida, setMarcaPreferida] = useState<MarcaDescuento | null>(null);
  const [plan, setPlan] = useState<PlanViaje | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usarMiUbicacion = useCallback(() => setOrigenTexto(""), []);

  const cambiarDestinoTexto = useCallback((v: string) => {
    setDestinoTexto(v);
    setDestinoCoords(null);
  }, []);

  const calcular = useCallback(async () => {
    if (!destinoTexto.trim() || !vehiculo) return;
    setCargando(true);
    setError(null);
    setPlan(null);
    try {
      let origen = coordenadas;
      if (origenTexto.trim()) {
        try {
          origen = await geocodificarDireccion(origenTexto.trim());
        } catch {
          throw new Error("ORIGEN_NO_ENCONTRADO");
        }
      }
      // Si el destino viene de una sugerencia elegida ya tenemos sus
      // coordenadas exactas; si el usuario escribió y pulsó Enter sin
      // elegir ninguna, geocodificamos el texto tal cual.
      const destino = destinoCoords ?? (await geocodificarDireccion(destinoTexto.trim()));
      const resultado = await planificarViaje(
        origen,
        destino,
        destinoTexto.trim(),
        todasGasolineras,
        vehiculo,
        combustible,
        marcaPreferida
      );
      setPlan(resultado);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "SIN_GASOLINERAS" && marcaPreferida) {
        const nombreMarca = PROGRAMAS_DESCUENTO.find((p) => p.marca === marcaPreferida)?.nombre;
        setError(`No hay gasolineras ${nombreMarca} en la ruta. Prueba con "Cualquier marca".`);
      } else {
        setError(ERRORES[msg] ?? "Error al planificar el viaje. Inténtalo de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  }, [origenTexto, destinoTexto, destinoCoords, marcaPreferida, vehiculo, coordenadas, todasGasolineras, combustible]);

  return (
    <div className="flex flex-col gap-4 p-4 pb-10">
      <h2 className="text-xl font-bold text-gray-900">Planifica tu viaje</h2>

      {/* Formulario */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
        {/* Origen */}
        <AutocompleteInput
          value={origenTexto}
          onChange={setOrigenTexto}
          placeholder="Tu ubicación actual"
          icon={<LocateFixed className="w-4 h-4" />}
          action={origenTexto ? { label: "Mi ubicación", onClick: usarMiUbicacion } : undefined}
          bias={coordenadas}
        />

        {/* Separador visual */}
        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 border-t border-dashed border-gray-200" />
          <Navigation className="w-3 h-3 text-gray-300 rotate-180" />
          <div className="flex-1 border-t border-dashed border-gray-200" />
        </div>

        {/* Destino */}
        <AutocompleteInput
          value={destinoTexto}
          onChange={cambiarDestinoTexto}
          onSeleccionar={(lugar: LugarSugerido) => setDestinoCoords({ lat: lugar.lat, lng: lugar.lng })}
          onKeyDown={(e) => e.key === "Enter" && calcular()}
          placeholder="¿A dónde vas?"
          icon={<MapPin className="w-4 h-4" />}
          bias={coordenadas}
        />

        {/* Marca preferida */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-0.5">
            Marca de gasolinera
          </span>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setMarcaPreferida(null)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                marcaPreferida === null
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Cualquier marca
            </button>
            {PROGRAMAS_DESCUENTO.map(({ marca, nombre }) => (
              <button
                key={marca}
                onClick={() => setMarcaPreferida(marca)}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  marcaPreferida === marca
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Vehículo */}
        <button
          onClick={onAbrirVehiculos}
          className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Car className="w-4 h-4 text-gray-500 flex-shrink-0" />
          {vehiculo ? (
            <span className="font-medium">{vehiculo.nombre}</span>
          ) : (
            <span className="text-gray-400">Sin vehículo — toca para añadir</span>
          )}
          <span className="ml-auto text-xs text-gray-400">Cambiar</span>
        </button>

        {/* Botón calcular */}
        <button
          onClick={calcular}
          disabled={!destinoTexto.trim() || !vehiculo || cargando}
          className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          {cargando ? <Spinner className="w-4 h-4" /> : <Navigation className="w-4 h-4" />}
          {cargando ? "Calculando ruta…" : "Calcular ruta"}
        </button>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl py-2.5 px-3 text-center">
            {error}
          </p>
        )}
      </div>

      {/* Resultados */}
      {plan && !cargando && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col gap-0.5">
              <span className="text-xs text-gray-400 font-medium">Distancia</span>
              <span className="text-base font-bold text-gray-900">{plan.distanciaKm} km</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col gap-0.5">
              <span className="text-xs text-gray-400 font-medium">Coste aprox.</span>
              <span className="text-base font-bold text-gray-900">{plan.costeEstimado.toFixed(2)}€</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col gap-0.5">
              <span className="text-xs text-gray-400 font-medium">Ahorro</span>
              <span className="text-base font-bold text-green-600">+{plan.ahorroEstimado.toFixed(2)}€</span>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden bg-gray-100" style={{ height: 220 }}>
            <RouteMap
              key={`${plan.destino}-${plan.distanciaKm}`}
              origen={plan.origen}
              destino={plan.destinoCoordenadas}
              rutaCoordenadas={plan.rutaCoordenadas}
              paradas={plan.paradas}
            />
          </div>

          {plan.paradas.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-gray-600 px-1">
                {plan.paradas.length === 1
                  ? "1 parada recomendada"
                  : `${plan.paradas.length} paradas recomendadas`}
              </h2>
              {plan.paradas.map((parada, i) => (
                <div
                  key={parada.gasolinera.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {parada.gasolinera.nombre}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {parada.gasolinera.localidad} · km {parada.kmDesdeOrigen}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Fuel className="w-3 h-3" />
                        {parada.litrosARepostar} L
                      </span>
                      <span className="text-xs font-semibold text-green-600">
                        {parada.costeRepostaje.toFixed(2)}€
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-sm text-gray-500">
                Tu vehículo cubre la ruta sin paradas intermedias.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <a href={urlGoogleMaps(plan)} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variante="primario" className="w-full gap-1.5">
                <Navigation2 className="w-4 h-4" />
                Iniciar en Google Maps
              </Button>
            </a>
            <a href={urlAppleMaps(plan)} target="_blank" rel="noopener noreferrer">
              <Button variante="secundario" className="gap-1.5">
                <ExternalLink className="w-4 h-4" />
                Apple
              </Button>
            </a>
          </div>
        </>
      )}

      {/* Estado vacío */}
      {!plan && !cargando && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Navigation className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
            Introduce tu destino y encontraremos las mejores gasolineras en ruta para ti.
          </p>
        </div>
      )}
    </div>
  );
}
