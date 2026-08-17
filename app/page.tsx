"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AlertCircle, Bell, HelpCircle, MapPin, MessageCircle, Percent, Search, X } from "lucide-react";
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
import { AutocompleteInput } from "@/components/trip/AutocompleteInput";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useGasolineras, useEstadisticas } from "@/hooks/useGasolineras";
import { useVehiculo } from "@/hooks/useVehiculo";
import { useNavigation } from "@/hooks/useNavigation";
import { useFavoritas } from "@/hooks/useFavoritas";
import { useAlertas } from "@/hooks/useAlertas";
import { useDescuentos } from "@/hooks/useDescuentos";
import { obtenerPrecio } from "@/lib/calculos";
import { FEEDBACK_FORM_URL } from "@/lib/site";
import { normalizarTexto } from "@/lib/utils";
import { buscarLugares, type LugarSugerido } from "@/lib/geocoding";
import type { Filtros, Coordenadas } from "@/types";

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

const HINT_MAPA_KEY = "gasolisto_hint_mapa_visto";

const SEO_HOME_TEXT =
  "Gasolisto es un comparador gratuito de gasolineras en España para encontrar gasolina 95, gasolina 98, diésel y GLP cerca de ti. Usa precios oficiales publicados por MITECO y ayuda a comparar el precio por litro junto al coste aproximado de llenar el depósito según tu coche. Puedes ver estaciones en mapa o lista, guardar favoritas, configurar descuentos, crear alertas y usar el planificador de viajes para encontrar paradas recomendadas donde repostar. No hace falta registrarse: tus vehículos, alertas y favoritas se guardan en tu dispositivo.";

export default function HomePage() {
  const { coordenadas, error: errorGeo, esFallback } = useGeolocation();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [soloFavoritas, setSoloFavoritas] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [hintMapaVisible, setHintMapaVisible] = useState(false);
  const [cargaInicialLenta, setCargaInicialLenta] = useState(false);
  // Rearma el temporizador si se reintenta mientras la carga sigue activa.
  const [reintentoNonce, setReintentoNonce] = useState(0);
  useEffect(() => {
    try {
      if (!localStorage.getItem(HINT_MAPA_KEY)) setHintMapaVisible(true);
    } catch {}
  }, []);
  const cerrarHintMapa = () => {
    try {
      localStorage.setItem(HINT_MAPA_KEY, "1");
    } catch {}
    setHintMapaVisible(false);
  };
  const { visible: onboardingVisible, cerrar: cerrarOnboarding, abrir: abrirOnboarding } = useOnboarding();
  const { descuentos, guardar: guardarDescuentos } = useDescuentos();
  const [descuentosVisible, setDescuentosVisible] = useState(false);

  // Búsqueda de ciudad/zona: cuando hay una zona activa, manda sobre la
  // ubicación real o el fallback interno (el usuario la ha elegido a
  // propósito, p.ej. para mirar precios antes de un viaje).
  const [zonaTexto, setZonaTexto] = useState("");
  const [zonaActiva, setZonaActiva] = useState<{ label: string; coords: Coordenadas } | null>(null);
  const [buscandoZona, setBuscandoZona] = useState(false);
  const [errorZona, setErrorZona] = useState<string | null>(null);

  const cambiarZonaTexto = (v: string) => {
    setZonaTexto(v);
    setErrorZona(null);
    if (v.trim() === "") setZonaActiva(null);
  };
  const seleccionarZona = (lugar: LugarSugerido) => {
    setZonaTexto(lugar.label);
    setZonaActiva({ label: lugar.label, coords: { lat: lugar.lat, lng: lugar.lng } });
    setErrorZona(null);
  };
  const buscarZona = async () => {
    const q = zonaTexto.trim();
    if (!q || buscandoZona) return;
    setBuscandoZona(true);
    setErrorZona(null);
    try {
      const [primero] = await buscarLugares(q, { limit: 1, soloLocalidades: true });
      if (!primero) throw new Error("NO_ENCONTRADO");
      setZonaActiva({ label: primero.label, coords: { lat: primero.lat, lng: primero.lng } });
      setZonaTexto(primero.label);
    } catch {
      setErrorZona("No se encontró esa ciudad o zona. Prueba con otro nombre.");
    } finally {
      setBuscandoZona(false);
    }
  };
  const limpiarZona = () => {
    setZonaActiva(null);
    setZonaTexto("");
    setErrorZona(null);
  };
  // Primer tramo de la etiqueta ("Valencia, Comunidad Valenciana" → "Valencia")
  // para textos cortos (contador, pill) sin repetir la dirección completa.
  const zonaCorta = zonaActiva?.label.split(",")[0].trim() ?? "";

  // Centro efectivo para mapa/lista: zona buscada > ubicación real > fallback
  // interno (coordenadas ya resuelve esa segunda prioridad por su cuenta).
  const centroActivo = zonaActiva?.coords ?? coordenadas;
  // Pin "tú estás aquí": solo con ubicación real confirmada, nunca con el
  // fallback interno ni con una zona buscada (no son "tu" ubicación).
  const ubicacionUsuario = esFallback ? null : coordenadas;

  const { vehiculos, vehiculoActivo, guardarVehiculo, eliminarVehiculo, seleccionarVehiculo, crearVehiculo, hidratado } = useVehiculo();
  const { todas, filtradas, cargando, error, ultimaActualizacion, refetch } = useGasolineras(centroActivo, filtros);
  const stats = useEstadisticas(filtradas, filtros);
  const { favoritas, toggleFavorita } = useFavoritas();
  const { alertas, resumenDiario, guardarAlerta, eliminarAlerta, obtenerAlerta, setResumenDiario } = useAlertas();

  useEffect(() => {
    if (!cargando) {
      setCargaInicialLenta(false);
      return;
    }

    const timer = window.setTimeout(() => setCargaInicialLenta(true), 8500);
    return () => window.clearTimeout(timer);
  }, [cargando, reintentoNonce]);

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
    cerrarPantallaSecundaria,
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
  // Búsqueda por nombre/localidad/dirección — solo afecta a la lista, no al
  // mapa, para no sorprender ocultando gasolineras cercanas mientras se busca.
  const gasolinerasBuscadas = useMemo(() => {
    const q = normalizarTexto(busqueda.trim());
    if (!q) return gasolinerasMostradas;
    return gasolinerasMostradas.filter(
      (g) =>
        normalizarTexto(g.nombre).includes(q) ||
        normalizarTexto(g.localidad).includes(q) ||
        normalizarTexto(g.direccion).includes(q)
    );
  }, [gasolinerasMostradas, busqueda]);
  const gasolinerasLista = useMemo(
    () => gasolinerasBuscadas.slice(0, LIMITE_RENDERIZADO),
    [gasolinerasBuscadas]
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

  const enfocarBuscadorZona = () => {
    document
      .querySelector<HTMLInputElement>('input[placeholder="Busca ciudad o zona"]')
      ?.focus();
  };

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
          <img src="/icons/icon-192.png" alt="" className="w-7 h-7 rounded-lg" />
          {/* Visualmente solo se ve "Gasolisto" (la barra de título debe caber
              en móvil), pero el nombre accesible/indexable del h1 es
              descriptivo — sin esto, el título de página con más peso SEO
              de toda la app era literalmente solo el nombre de marca. */}
          <h1 className="font-bold text-gray-900 text-base">
            Gasolisto
            <span className="sr-only"> — Precios de gasolina y diésel baratos cerca de ti</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {cargando && <Spinner className="w-4 h-4" />}
          {!cargando && !error && (
            <span className="text-xs text-gray-400">
              {gasolinerasMostradas.length} {zonaActiva ? `en ${zonaCorta}` : esFallback ? "disponibles" : "cerca"}
            </span>
          )}
          <button
            onClick={() => { cerrarPantallaSecundaria(); setDescuentosVisible(true); }}
            aria-label="Mis descuentos con tarjetas y apps"
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Percent className="w-4 h-4 text-gray-400" />
          </button>
          <a
            href={FEEDBACK_FORM_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Enviar feedback sobre Gasolisto"
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-gray-400" />
          </a>
          <button
            onClick={() => { cerrarPantallaSecundaria(); abrirOnboarding(); }}
            aria-label="Qué puedes hacer en Gasolisto"
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Buscador de ciudad/zona: refuerza que Gasolisto sirve para toda
          España, no solo para el fallback interno de Madrid. */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex-shrink-0">
        <AutocompleteInput
          value={zonaTexto}
          onChange={cambiarZonaTexto}
          onSeleccionar={seleccionarZona}
          onKeyDown={(e) => e.key === "Enter" && buscarZona()}
          placeholder="Busca ciudad o zona"
          icon={buscandoZona ? <Spinner className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          soloLocalidades
        />
        {errorZona && (
          <p className="text-xs text-red-600 mt-1.5 px-1">{errorZona}</p>
        )}
      </div>

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

      {/* Microayuda de primera vista: qué hacer con los precios del mapa */}
      {hintMapaVisible && tabActiva === "mapa" && pantalla === null && (
        <div className="bg-green-50 border-b border-green-100 px-4 py-2 flex items-center gap-2 flex-shrink-0">
          <MapPin className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-700 flex-1 leading-snug">
            Toca un precio para ver gasolinera, ahorro y ruta · Datos oficiales MITECO
          </p>
          <button
            onClick={cerrarHintMapa}
            aria-label="Cerrar ayuda"
            className="p-0.5 text-green-500 hover:text-green-700 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mapa — ocupa todo el espacio restante */}
      <div className="flex-1 relative overflow-hidden">
        <MapView
          gasolineras={gasolinerasMapa}
          combustible={filtros.combustible}
          centro={centroActivo}
          ubicacionUsuario={ubicacionUsuario}
          seleccionadaId={seleccionadaId}
          activo={tabActiva === "mapa"}
          visible={tabActiva === "mapa" && pantalla === null}
          onSelect={handleSelect}
        />

        {/* Carga inicial: sin esto el mapa se veía unos segundos sin pines,
            precios ni contador —vacío y sin explicación— mientras la petición
            a /api/gasolineras seguía en curso (la Lista sí mostraba su propio
            spinner para el mismo estado). */}
        {cargando && tabActiva === "mapa" && pantalla === null && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80" style={{ zIndex: 500 }}>
            <div className="bg-white rounded-2xl shadow-card-hover px-4 py-3 mx-4 max-w-xs">
              <div className="flex items-center justify-center gap-2.5">
                <Spinner className="w-4 h-4" />
                <div className="text-left">
                  <p className="text-xs font-medium text-gray-700">Cargando precios oficiales del MITECO…</p>
                  {!cargaInicialLenta && (
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      Buscando gasolineras y precios actualizados cerca de ti.
                    </p>
                  )}
                </div>
              </div>
              {cargaInicialLenta && (
                <div className="mt-3 border-t border-gray-100 pt-3 text-center">
                  <p className="text-xs font-semibold text-gray-700">
                    Está tardando más de lo normal
                  </p>
                  <p className="mt-1 text-xs text-gray-500 leading-snug">
                    Seguimos consultando los precios oficiales. Puedes esperar unos segundos o intentarlo de nuevo.
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCargaInicialLenta(false);
                        setReintentoNonce((n) => n + 1);
                        refetch();
                      }}
                      className="rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                    >
                      Reintentar
                    </button>
                    <button
                      type="button"
                      onClick={enfocarBuscadorZona}
                      className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                    >
                      Buscar ciudad
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Avisos superiores: zona buscada, ubicación de respaldo y modo
            "sin límite". Nunca se menciona Madrid: el fallback interno es
            solo eso, interno — de cara al usuario invitamos a buscar su
            ciudad o dar permiso de ubicación. */}
        {(zonaActiva || esFallback || (tabActiva === "mapa" && filtros.radio === null)) && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 px-4 w-full">
            {zonaActiva ? (
              <div className="bg-white/90 backdrop-blur-sm pl-3 pr-1.5 py-1.5 rounded-full shadow-card text-xs text-gray-700 font-medium border border-gray-200 flex items-center gap-1.5 max-w-full">
                <span className="truncate">Mostrando {zonaCorta}</span>
                <button
                  onClick={limpiarZona}
                  aria-label="Quitar búsqueda de zona"
                  className="p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : esFallback ? (
              <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-card text-xs text-amber-700 font-medium border border-amber-100 text-center">
                Busca tu ciudad o permite ubicación para ver gasolineras cercanas
              </div>
            ) : null}
            {tabActiva === "mapa" && filtros.radio === null && (
              <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-card text-xs text-gray-600 font-medium border border-gray-200 text-center">
                Mostrando las más cercanas · en Lista verás las más baratas de España
              </div>
            )}
          </div>
        )}

        {/* Error al cargar precios: antes esto dejaba el mapa vacío y sin
            ningún aviso, indistinguible de "se ha quedado pillado", hasta
            que el usuario recargaba la página a mano. */}
        {error && tabActiva === "mapa" && pantalla === null && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 w-full" style={{ zIndex: 500 }}>
            <div className="bg-white rounded-2xl shadow-card-hover border border-red-100 px-4 py-3 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700">No hemos podido cargar los precios</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Puede ser un problema temporal al consultar los datos oficiales. Prueba de nuevo en unos segundos.
                </p>
              </div>
              <button
                onClick={refetch}
                className="text-xs font-semibold text-green-600 hover:text-green-700 flex-shrink-0"
              >
                Reintentar
              </button>
            </div>
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

        {/* Texto SEO discreto: en móvil queda solo para lectores/crawlers para
            no invadir el mapa; en escritorio aparece como panel informativo. */}
        <section
          aria-labelledby="seo-home-title"
          className="sr-only lg:not-sr-only lg:absolute lg:left-4 lg:bottom-4 lg:z-[450] lg:max-w-md lg:rounded-2xl lg:border lg:border-gray-200 lg:bg-white/90 lg:p-4 lg:shadow-card lg:backdrop-blur-sm"
        >
          <h2 id="seo-home-title" className="text-sm font-bold text-gray-900">
            Comparador de gasolineras en España
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
            {SEO_HOME_TEXT}
          </p>
          <nav aria-label="Enlaces sobre Gasolisto" className="mt-2 flex gap-3 text-xs font-medium">
            <Link href="/como-funciona" className="text-green-700 hover:text-green-800 underline underline-offset-2">
              Cómo funciona
            </Link>
            <Link href="/privacidad" className="text-gray-500 hover:text-gray-700 underline underline-offset-2">
              Privacidad
            </Link>
          </nav>
        </section>
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
              totalDisponible={gasolinerasBuscadas.length}
              filtros={filtros}
              stats={stats}
              vehiculo={hidratado ? vehiculoActivo : undefined}
              seleccionadaId={seleccionadaId}
              cargando={cargando}
              error={error}
              ultimaActualizacion={ultimaActualizacion}
              favoritas={favoritas}
              descuentos={descuentos}
              busqueda={busqueda}
              onBusquedaChange={setBusqueda}
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
