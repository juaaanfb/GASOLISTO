"use client";
import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { MapPin, Navigation, Navigation2, ExternalLink, Car, Fuel, LocateFixed, Gauge, AlertTriangle, Info } from "lucide-react";
import type { Coordenadas, Gasolinera, Vehiculo, TipoCombustible } from "@/types";
import type { PlanViaje } from "@/types/trip";
import { planificarViaje, geocodificarDireccion } from "@/lib/routing";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { AutocompleteInput } from "@/components/trip/AutocompleteInput";
import type { LugarSugerido } from "@/lib/geocoding";
import { MARCAS, type Marca } from "@/lib/marcas";
import { cn } from "@/lib/utils";
import { track, bucketDistanciaRuta } from "@/lib/analytics";

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
  RUTA_CORTA: "Origen y destino están prácticamente en el mismo punto.",
  NO_ENCONTRADO: "No se encontró ese destino. Prueba con otra dirección.",
  ORIGEN_NO_ENCONTRADO: "No se encontró el origen. Prueba con otra dirección.",
  RUTA_NO_ENCONTRADA: "No se pudo calcular la ruta. Verifica el destino.",
  GEOCODING_ERROR: "Error al buscar la dirección. Inténtalo de nuevo.",
  OSRM_ERROR: "Error al calcular la ruta. Inténtalo de nuevo.",
  AUTONOMIA_INVALIDA: "Indica cuántos km de autonomía te quedan antes de calcular.",
  SIN_PARADA_ALCANZABLE:
    "No se ha encontrado un plan viable: con la autonomía indicada no hay ninguna gasolinera alcanzable por carretera antes de quedarte sin combustible. Revisa el dato de autonomía o reposta antes de salir.",
  SIN_PARADA_ALCANZABLE_MARCA:
    "No hay gasolineras de esa marca alcanzables con la autonomía indicada. Prueba con \"Cualquier marca\".",
};

interface TripPlannerProps {
  coordenadas: Coordenadas;
  ubicacionDisponible: boolean;
  todasGasolineras: Gasolinera[];
  vehiculo: Vehiculo | undefined;
  combustible: TipoCombustible;
  onAbrirVehiculos: () => void;
}

export function TripPlanner({
  coordenadas,
  ubicacionDisponible,
  todasGasolineras,
  vehiculo,
  combustible,
  onAbrirVehiculos,
}: TripPlannerProps) {
  const [origenTexto, setOrigenTexto] = useState("");
  const [destinoTexto, setDestinoTexto] = useState("");
  const [destinoCoords, setDestinoCoords] = useState<Coordenadas | null>(null);
  const [marcaPreferida, setMarcaPreferida] = useState<Marca | null>(null);
  const [plan, setPlan] = useState<PlanViaje | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const calculandoRef = useRef(false);
  const faltaOrigen = !ubicacionDisponible && !origenTexto.trim();

  // Autonomía restante: texto libre como en el formulario de vehículo (se
  // puede borrar del todo sin que un "0" intermedio se cuele), nunca
  // precargado con la autonomía máxima del vehículo — eso sería asumir
  // depósito lleno en silencio. "Uso el depósito lleno" más abajo es la
  // única vía para rellenarlo con ese valor, y es una acción explícita.
  const [autonomiaTexto, setAutonomiaTexto] = useState("");
  const [autonomiaError, setAutonomiaError] = useState<string | null>(null);
  const autonomiaMaximaVehiculo = vehiculo ? (vehiculo.deposito / vehiculo.consumo) * 100 : null;

  // Valida el texto de autonomía sin mutar el estado de error salvo que se
  // pida explícitamente (evita marcar error en cada tecleo mientras se
  // escribe); usada tanto por el botón "Calcular" como por el aviso en vivo.
  const validarAutonomia = useCallback((): { valor: number; aviso: string | null } | { error: string } => {
    const texto = autonomiaTexto.trim().replace(",", ".");
    if (texto === "") return { error: "Indica cuántos km de autonomía te quedan." };
    const valor = Number(texto);
    if (!Number.isFinite(valor)) return { error: "Introduce un número válido de kilómetros." };
    if (valor === 0) return { error: "Con 0 km de autonomía no puedes iniciar el viaje. Reposta antes de salir." };
    if (valor < 0) return { error: "La autonomía no puede ser negativa." };
    let aviso: string | null = null;
    if (autonomiaMaximaVehiculo && valor > autonomiaMaximaVehiculo * 1.1) {
      aviso = `Esto supera la autonomía máxima estimada de tu vehículo (~${Math.round(autonomiaMaximaVehiculo)} km con el depósito lleno). Revisa el dato si no es correcto.`;
    }
    return { valor, aviso };
  }, [autonomiaTexto, autonomiaMaximaVehiculo]);

  const estadoAutonomia = validarAutonomia();
  const avisoAutonomia = "aviso" in estadoAutonomia ? estadoAutonomia.aviso : null;

  const usarDepositoLleno = useCallback(() => {
    if (!vehiculo) return;
    const autonomia = Math.round((vehiculo.deposito / vehiculo.consumo) * 100);
    setAutonomiaTexto(String(autonomia));
    setAutonomiaError(null);
  }, [vehiculo]);

  const usarMiUbicacion = useCallback(() => setOrigenTexto(""), []);

  // Igual que en la búsqueda de ciudad de la home: se marca "empezó" solo
  // en la transición vacío → con texto, una vez por búsqueda de destino.
  const busquedaDestinoIniciadaRef = useRef(false);
  const cambiarDestinoTexto = useCallback((v: string) => {
    if (v.trim() !== "" && !busquedaDestinoIniciadaRef.current) {
      busquedaDestinoIniciadaRef.current = true;
      track("trip_search_started");
    }
    setDestinoTexto(v);
    setDestinoCoords(null);
    if (v.trim() === "") busquedaDestinoIniciadaRef.current = false;
  }, []);
  const seleccionarDestino = useCallback((lugar: LugarSugerido) => {
    setDestinoCoords({ lat: lugar.lat, lng: lugar.lng });
    track("trip_result_selected", {
      city: lugar.city ?? null,
      province: lugar.province ?? null,
    });
    busquedaDestinoIniciadaRef.current = false;
  }, []);

  const calcular = useCallback(async () => {
    if (!destinoTexto.trim() || !vehiculo || faltaOrigen || calculandoRef.current) return;
    // La autonomía inválida (vacía, 0, negativa, no numérica) se corta aquí,
    // sin pedir ruta ni gasolineras: nunca se recomienda conducir hasta una
    // parada lejana con el depósito a cero.
    const estado = validarAutonomia();
    if ("error" in estado) {
      setAutonomiaError(estado.error);
      return;
    }
    setAutonomiaError(null);
    calculandoRef.current = true;
    setCargando(true);
    setError(null);
    setPlan(null);
    track("trip_calculation_started", {
      has_custom_origin: origenTexto.trim().length > 0,
      fuel_type: combustible,
      has_preferred_brand: marcaPreferida !== null,
    });
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
        estado.valor,
        marcaPreferida
      );
      setPlan(resultado);
      track("trip_calculated", {
        distance_bucket: bucketDistanciaRuta(resultado.distanciaKm),
        result_count: resultado.paradas.length,
        fuel_type: combustible,
        has_preferred_brand: marcaPreferida !== null,
        has_custom_origin: origenTexto.trim().length > 0,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      track("trip_calculation_failed", {
        reason: Object.hasOwn(ERRORES, msg) ? msg : "UNKNOWN",
      });
      if (msg === "SIN_PARADA_ALCANZABLE_MARCA" && marcaPreferida) {
        const nombreMarca = MARCAS.find((m) => m.marca === marcaPreferida)?.nombre;
        setError(`No hay gasolineras ${nombreMarca} alcanzables con esos datos. Prueba con "Cualquier marca".`);
      } else {
        setError(ERRORES[msg] ?? "Error al planificar el viaje. Inténtalo de nuevo.");
      }
    } finally {
      calculandoRef.current = false;
      setCargando(false);
    }
  }, [origenTexto, destinoTexto, destinoCoords, marcaPreferida, vehiculo, coordenadas, todasGasolineras, combustible, faltaOrigen, validarAutonomia]);

  return (
    <div className="flex flex-col gap-4 p-4 pb-10">
      <h2 className="text-xl font-bold text-gray-900">Planifica tu viaje</h2>

      {/* Formulario */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
        {/* Origen */}
        <AutocompleteInput
          value={origenTexto}
          onChange={setOrigenTexto}
          placeholder={ubicacionDisponible ? "Tu ubicación actual" : "Escribe el origen"}
          icon={<LocateFixed className="w-4 h-4" />}
          action={ubicacionDisponible && origenTexto ? { label: "Mi ubicación", onClick: usarMiUbicacion } : undefined}
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
          onSeleccionar={seleccionarDestino}
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
            {MARCAS.map(({ marca, nombre }) => (
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

        {/* Autonomía restante */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-0.5">
            Autonomía restante <span className="text-gray-400 font-normal normal-case">(km que te quedan ahora)</span>
          </label>
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl">
            <Gauge className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              type="text"
              inputMode="decimal"
              value={autonomiaTexto}
              onChange={(e) => { setAutonomiaTexto(e.target.value); setAutonomiaError(null); }}
              placeholder="Ej: 120"
              aria-label="Autonomía restante en kilómetros"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none min-w-0"
            />
            {vehiculo && (
              <button
                type="button"
                onClick={usarDepositoLleno}
                className="flex-shrink-0 text-xs font-medium text-green-700 hover:text-green-800 whitespace-nowrap"
              >
                Uso el depósito lleno
              </button>
            )}
          </div>
          {autonomiaError && (
            <p className="text-xs text-red-500 flex items-start gap-1">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {autonomiaError}
            </p>
          )}
          {!autonomiaError && avisoAutonomia && (
            <p className="text-xs text-amber-600 flex items-start gap-1">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {avisoAutonomia}
            </p>
          )}
        </div>

        {/* Botón calcular */}
        <button
          onClick={calcular}
          disabled={faltaOrigen || !destinoTexto.trim() || !vehiculo || !autonomiaTexto.trim() || cargando}
          className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          {cargando ? <Spinner className="w-4 h-4" /> : <Navigation className="w-4 h-4" />}
          {cargando ? "Calculando ruta…" : "Calcular ruta"}
        </button>

        {!cargando && (faltaOrigen || !destinoTexto.trim() || !vehiculo || !autonomiaTexto.trim()) && (
          <p className="text-xs text-gray-400 text-center -mt-1">
            {faltaOrigen
              ? "Añade un origen: no tenemos tu ubicación."
              : !destinoTexto.trim()
              ? "Añade tu destino para calcular la ruta."
              : !vehiculo
              ? "Configura tu vehículo para estimar el ahorro y las paradas."
              : "Indica tu autonomía restante para calcular las paradas."}
          </p>
        )}

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
              <span className="text-xs text-gray-400 font-medium">Coste estimado</span>
              <span className="text-base font-bold text-gray-900">{plan.costeEstimado.toFixed(2)}€</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col gap-0.5">
              <span className="text-xs text-gray-400 font-medium">Ahorro estimado</span>
              <span className="text-base font-bold text-green-600">+{plan.ahorroEstimado.toFixed(2)}€</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 px-1 -mt-2 flex items-start gap-1">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Con {plan.autonomiaRestanteKm} km de autonomía restante y un margen de reserva del {Math.round((1 - plan.margenReserva) * 100)}%.
            Estimación sobre los datos actuales, no una garantía de llegada ni de precio.
          </p>

          {plan.avisos.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col gap-1">
              {plan.avisos.map((aviso, i) => (
                <p key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {aviso}
                </p>
              ))}
            </div>
          )}

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
                      {parada.gasolinera.localidad} · km {parada.kmDesdeOrigen} · desvío ≈ {parada.desvioKm} km
                    </p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Fuel className="w-3 h-3" />
                        {parada.litrosARepostar} L
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        {parada.costeRepostaje.toFixed(2)}€ a repostar
                      </span>
                      <span className={cn(
                        "text-xs font-medium",
                        parada.ahorroNetoEstimado > 0 ? "text-green-600" : "text-gray-400"
                      )}>
                        {parada.ahorroNetoEstimado > 0
                          ? `≈ ${parada.ahorroNetoEstimado.toFixed(2)}€ de ahorro neto estimado`
                          : "parada necesaria: el desvío no compensa frente a la media"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Autonomía estimada tras repostar aquí: ≈ {parada.autonomiaTrasRepostarKm} km
                    </p>
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
            <a
              href={urlGoogleMaps(plan)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("maps_route_clicked", { source: "trip_planner", provider: "google", fuel_type: combustible })}
              className="flex-1"
            >
              <Button variante="primario" className="w-full gap-1.5">
                <Navigation2 className="w-4 h-4" />
                Iniciar en Google Maps
              </Button>
            </a>
            <a
              href={urlAppleMaps(plan)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("maps_route_clicked", { source: "trip_planner", provider: "apple", fuel_type: combustible })}
            >
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
