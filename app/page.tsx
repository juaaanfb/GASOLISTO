"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Bell, HelpCircle, Percent, X } from "lucide-react";
import { WelcomeModal, useOnboarding } from "@/components/onboarding/WelcomeModal";
import { DescuentosForm } from "@/components/discounts/DescuentosForm";
import { FilterBar } from "@/components/filters/FilterBar";
import { StationList } from "@/components/list/StationList";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { NavBar } from "@/components/ui/NavBar";
import { StationDetail } from "@/components/station/StationDetail";
import { VehicleSelector } from "@/components/vehicle/VehicleSelector";
import { VehicleForm } from "@/components/vehicle/VehicleForm";
import { Spinner } from "@/components/ui/Spinner";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useGasolineras, useEstadisticas } from "@/hooks/useGasolineras";
import { useVehiculo } from "@/hooks/useVehiculo";
import { useNavigation } from "@/hooks/useNavigation";
import { useFavoritas } from "@/hooks/useFavoritas";
import { useAlertas } from "@/hooks/useAlertas";
import { useDescuentos } from "@/hooks/useDescuentos";
import { obtenerPrecio } from "@/lib/calculos";
import type { Filtros } from "@/types";

const MapView = dynamic(
  () => import("@/components/map/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <Spinner className="w-8 h-8" />
      </div>
    ),
  }
);

const TripPlanner = dynamic(
  () => import("@/components/trip/TripPlanner").then((m) => m.TripPlanner),
  { ssr: false }
);

const FILTROS_INICIALES: Filtros = {
  combustible: "gasolina95",
  radio: 5,
};

// Con radio "sin límite" (o muchas favoritas) filtradas puede tener miles de
// estaciones — renderizar un marker/card por cada una congela el móvil.
// filtradas ya viene ordenada por precio ascendente, así que recortar aquí
// sigue mostrando siempre las más baratas primero.
const LIMITE_RENDERIZADO = 300;

export default function HomePage() {
  const { coordenadas, error: errorGeo, esFallback } = useGeolocation();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [soloFavoritas, setSoloFavoritas] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { visible: onboardingVisible, cerrar: cerrarOnboarding, abrir: abrirOnboarding } = useOnboarding();
  const { descuentos, guardar: guardarDescuentos } = useDescuentos();
  const [descuentosVisible, setDescuentosVisible] = useState(false);

  const { vehiculos, vehiculoActivo, guardarVehiculo, eliminarVehiculo, seleccionarVehiculo, crearVehiculo, hidratado } = useVehiculo();
  const { todas, filtradas, cargando, error, ultimaActualizacion, refetch } = useGasolineras(coordenadas, filtros);
  const stats = useEstadisticas(filtradas, filtros);
  const { favoritas, toggleFavorita } = useFavoritas();
  const { alertas, resumenDiario, guardarAlerta, eliminarAlerta, obtenerAlerta, setResumenDiario } = useAlertas();

  const {
    pantalla,
    tabActiva,
    seleccionadaId,
    vehiculoEditando,
    esVehiculoNuevo,
    handleSelect,
    handleTabChange,
    handleNuevoVehiculo,
    handleEditarVehiculo,
    handleGuardarVehiculo,
    handleEliminarVehiculo,
    cerrarDetalle,
    cerrarVehiculos,
  } = useNavigation({ vehiculos, guardarVehiculo, eliminarVehiculo, seleccionarVehiculo, crearVehiculo, setFiltros });

  // Gasolineras a mostrar en la lista (filtradas por favoritas si aplica)
  const gasolinerasMostradas = useMemo(
    () => soloFavoritas ? filtradas.filter((g) => favoritas.has(g.id)) : filtradas,
    [filtradas, favoritas, soloFavoritas]
  );

  // Versiones recortadas solo para renderizar (mapa y lista) — los cálculos
  // de estadísticas/comparativas siguen usando los arrays completos.
  // El mapa se recorta por CERCANÍA (no por precio, a diferencia de la lista):
  // con radio "sin límite", filtradas viene ordenada por precio nacional, y
  // recortarla tal cual dejaba el mapa mostrando gasolineras baratas
  // desperdigadas por España, sin relación con la zona que se está mirando.
  const gasolinerasMapa = useMemo(
    () =>
      [...filtradas]
        .sort((a, b) => (a.distancia ?? Infinity) - (b.distancia ?? Infinity))
        .slice(0, LIMITE_RENDERIZADO),
    [filtradas]
  );
  const gasolinerasLista = useMemo(
    () => gasolinerasMostradas.slice(0, LIMITE_RENDERIZADO),
    [gasolinerasMostradas]
  );

  const gasolineraSeleccionada = filtradas.find((g) => g.id === seleccionadaId) ?? null;

  // Alertas disparadas (precio real <= umbral configurado)
  const alertasDisparadas = useMemo(() => {
    if (todas.length === 0) return [];
    return alertas.flatMap((a) => {
      const g = todas.find((x) => x.id === a.gasolineraId);
      if (!g) return [];
      const precio = obtenerPrecio(g, a.combustible);
      if (precio === undefined || precio > a.umbral) return [];
      return [{ gasolinera: g, precio, umbral: a.umbral }];
    });
  }, [alertas, todas]);

  // Gasolinera más barata para el combustible activo (resumen diario)
  const masBarata = filtradas[0] ?? null;
  const precioMasBarata = masBarata ? obtenerPrecio(masBarata, filtros.combustible) : null;

  const mostrarBanner = !bannerDismissed && hidratado && (
    alertasDisparadas.length > 0 || (resumenDiario && !!precioMasBarata)
  );

  // Notificación del navegador (una vez por sesión)
  const notifFiredRef = useRef(false);
  useEffect(() => {
    if (alertasDisparadas.length === 0 || notifFiredRef.current) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    notifFiredRef.current = true;
    alertasDisparadas.forEach(({ gasolinera, precio, umbral }) => {
      new Notification(`Alerta de precio: ${gasolinera.nombre}`, {
        body: `Precio actual ${precio.toFixed(3)}€/L — por debajo de tu umbral de ${umbral.toFixed(3)}€/L`,
        icon: "/icons/icon-192.png",
      });
    });
  }, [alertasDisparadas]);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-gray-50">
      {/* Barra de título */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <img src="/icons/icon-192.png" alt="Gasolisto" className="w-7 h-7 rounded-lg" />
          <h1 className="font-bold text-gray-900 text-base">Gasolisto</h1>
        </div>
        <div className="flex items-center gap-2">
          {cargando && <Spinner className="w-4 h-4" />}
          {!cargando && !error && (
            <span className="text-xs text-gray-400">{gasolinerasMostradas.length} cerca</span>
          )}
          <button
            onClick={() => setDescuentosVisible(true)}
            aria-label="Mis descuentos con tarjetas y apps"
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Percent className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={abrirOnboarding}
            aria-label="Qué puedes hacer en Gasolisto"
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Banner de alertas y resumen diario */}
      {mostrarBanner && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-start gap-2 flex-shrink-0">
          <Bell className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-0.5">
            {resumenDiario && precioMasBarata && masBarata && (
              <p className="text-xs text-amber-800 font-medium">
                Más barata hoy: {masBarata.nombre} a {precioMasBarata.toFixed(3)}€/L
              </p>
            )}
            {alertasDisparadas.map(({ gasolinera, precio, umbral }) => (
              <p key={gasolinera.id} className="text-xs text-amber-700">
                {gasolinera.nombre}: {precio.toFixed(3)}€/L — por debajo de tu umbral ({umbral.toFixed(3)}€/L)
              </p>
            ))}
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="p-0.5 text-amber-400 hover:text-amber-600 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filtros siempre visibles */}
      <FilterBar
        filtros={filtros}
        onChange={setFiltros}
        soloFavoritas={soloFavoritas}
        onToggleSoloFavoritas={() => setSoloFavoritas((v) => !v)}
      />

      {/* Mapa — ocupa todo el espacio restante */}
      <div className="flex-1 relative overflow-hidden">
        <MapView
          gasolineras={gasolinerasMapa}
          combustible={filtros.combustible}
          centro={coordenadas}
          seleccionadaId={seleccionadaId}
          activo={tabActiva === "mapa"}
          visible={tabActiva === "mapa" && pantalla === null}
          onSelect={handleSelect}
        />

        {/* Avisos superiores: ubicación de respaldo y modo "sin límite" */}
        {(esFallback || (tabActiva === "mapa" && filtros.radio === null)) && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 px-4 w-full">
            {esFallback && (
              <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-card text-xs text-amber-700 font-medium border border-amber-100 whitespace-nowrap">
                Mostrando Madrid (sin acceso a tu ubicación)
              </div>
            )}
            {tabActiva === "mapa" && filtros.radio === null && (
              <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-card text-xs text-gray-600 font-medium border border-gray-200 text-center">
                Mostrando las más cercanas · en Lista verás las más baratas de España
              </div>
            )}
          </div>
        )}

        {/* Planificador de viaje */}
        {tabActiva === "viaje" && (
          <div className="absolute inset-0 overflow-y-auto bg-gray-50" style={{ zIndex: 1000 }}>
            <TripPlanner
              coordenadas={coordenadas}
              todasGasolineras={todas}
              vehiculo={hidratado ? vehiculoActivo : undefined}
              combustible={filtros.combustible}
              onAbrirVehiculos={() => handleTabChange("vehiculos")}
            />
          </div>
        )}

        {/* Botón de ver lista — visible en vista mapa */}
        {tabActiva === "mapa" && pantalla === null && !cargando && filtradas.length > 0 && (
          <button
            onClick={() => handleTabChange("lista")}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-card-hover flex items-center gap-2"
          >
            <span>Ver lista ({gasolinerasMostradas.length})</span>
          </button>
        )}
      </div>

      {/* BottomSheet para lista, detalle y vehículos */}
      <BottomSheet
        abierto={tabActiva === "lista" || pantalla !== null}
        onClose={tabActiva === "lista" && pantalla === null
          ? () => handleTabChange("mapa")
          : undefined
        }
        altura={
          pantalla === "detalle" || pantalla === "vehiculos" || pantalla === "formVehiculo"
            ? "completa"
            : "media"
        }
      >
        {/* Vista: lista de gasolineras */}
        {tabActiva === "lista" && pantalla === null && (
          <div className="h-full overflow-y-auto">
            <StationList
              gasolineras={gasolinerasLista}
              totalDisponible={gasolinerasMostradas.length}
              filtros={filtros}
              stats={stats}
              vehiculo={hidratado ? vehiculoActivo : undefined}
              seleccionadaId={seleccionadaId}
              cargando={cargando}
              error={error}
              ultimaActualizacion={ultimaActualizacion}
              favoritas={favoritas}
              descuentos={descuentos}
              onSelect={handleSelect}
              onToggleFavorita={toggleFavorita}
              onRefetch={refetch}
            />
          </div>
        )}

        {/* Vista: detalle gasolinera */}
        {pantalla === "detalle" && gasolineraSeleccionada && (
          <StationDetail
            gasolinera={gasolineraSeleccionada}
            combustibleActivo={filtros.combustible}
            gasolinerasRadio={filtradas}
            vehiculo={hidratado ? vehiculoActivo : undefined}
            descuentos={descuentos}
            esFavorita={favoritas.has(gasolineraSeleccionada.id)}
            onToggleFavorita={() => toggleFavorita(gasolineraSeleccionada.id)}
            alerta={obtenerAlerta(gasolineraSeleccionada.id)}
            onGuardarAlerta={guardarAlerta}
            onEliminarAlerta={() => eliminarAlerta(gasolineraSeleccionada.id)}
            resumenDiario={resumenDiario}
            onSetResumenDiario={setResumenDiario}
            onClose={cerrarDetalle}
          />
        )}

        {/* Vista: lista de vehículos */}
        {pantalla === "vehiculos" && (
          <VehicleSelector
            vehiculos={vehiculos}
            activoId={vehiculoActivo?.id ?? ""}
            onSeleccionar={seleccionarVehiculo}
            onEditar={handleEditarVehiculo}
            onNuevo={handleNuevoVehiculo}
            onCerrar={cerrarVehiculos}
          />
        )}

        {/* Vista: formulario de vehículo */}
        {pantalla === "formVehiculo" && vehiculoEditando && (
          <VehicleForm
            vehiculo={vehiculoEditando}
            esNuevo={esVehiculoNuevo}
            onGuardar={handleGuardarVehiculo}
            onEliminar={!esVehiculoNuevo && vehiculoEditando.id !== "default" ? handleEliminarVehiculo : undefined}
            onCancelar={() => handleTabChange("vehiculos")}
          />
        )}
      </BottomSheet>

      {/* Barra de navegación inferior */}
      <NavBar
        tabActiva={tabActiva}
        onChange={handleTabChange}
        aviso={errorGeo}
      />

      {onboardingVisible && <WelcomeModal onCerrar={cerrarOnboarding} />}
      {descuentosVisible && (
        <DescuentosForm
          descuentos={descuentos}
          onGuardar={guardarDescuentos}
          onCerrar={() => setDescuentosVisible(false)}
        />
      )}
    </div>
  );
}
