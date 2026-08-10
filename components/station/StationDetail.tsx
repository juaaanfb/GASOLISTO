"use client";
import { useState } from "react";
import { X, MapPin, Clock, Navigation2, ExternalLink, Fuel, Star, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Gasolinera, Vehiculo, TipoCombustible } from "@/types";
import { COMBUSTIBLES } from "@/types";
import { calcularAhorro, calcularEstadisticas, clasificarPrecio, obtenerPrecio, formatPrecio, formatEuros } from "@/lib/calculos";
import { cn } from "@/lib/utils";
import type { AlertaConfig } from "@/hooks/useAlertas";

interface StationDetailProps {
  gasolinera: Gasolinera;
  combustibleActivo: TipoCombustible;
  gasolinerasRadio: Gasolinera[];
  vehiculo?: Vehiculo;
  esFavorita: boolean;
  onToggleFavorita: () => void;
  alerta: AlertaConfig | null;
  onGuardarAlerta: (a: AlertaConfig) => void;
  onEliminarAlerta: () => void;
  resumenDiario: boolean;
  onSetResumenDiario: (v: boolean) => void;
  onClose: () => void;
}

// ─── Parser de horario MITECO ─────────────────────────────────────────────────

const DIA_IDX: Record<string, number> = {
  L: 1, M: 2, X: 3, J: 4, V: 5, S: 6, D: 0,
};

function expandirDias(diasStr: string): number[] {
  if (diasStr.includes("-")) {
    const [d1, d2] = diasStr.split("-");
    const inicio = DIA_IDX[d1];
    const fin = DIA_IDX[d2];
    if (inicio === undefined || fin === undefined) return [];
    const orden = [1, 2, 3, 4, 5, 6, 0];
    const i1 = orden.indexOf(inicio);
    const i2 = orden.indexOf(fin);
    if (i1 === -1 || i2 === -1) return [];
    return orden.slice(i1, i2 + 1);
  }
  if (diasStr.includes(",")) {
    return diasStr.split(",").map((d) => DIA_IDX[d]).filter((d) => d !== undefined) as number[];
  }
  const d = DIA_IDX[diasStr];
  return d !== undefined ? [d] : [];
}

type EstadoApertura = "abierto" | "cerrado" | "desconocido";

interface InfoHorario {
  estado: EstadoApertura;
  etiqueta: string;
}

function parsearHorario(horario: string): InfoHorario {
  if (!horario?.trim()) return { estado: "desconocido", etiqueta: "Horario no disponible" };

  const h = horario.trim().toUpperCase();

  if (h === "24H" || h === "L-D: 24H" || h.startsWith("24H")) {
    return { estado: "abierto", etiqueta: "Abierto 24 horas" };
  }

  const ahora = new Date();
  const diaJs = ahora.getDay();
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();

  const segmentos = h.split(";").map((s) => s.trim()).filter(Boolean);

  for (const seg of segmentos) {
    if (seg.includes("24H")) {
      const partesDias = seg.split(":")[0].trim();
      if (expandirDias(partesDias).includes(diaJs)) {
        return { estado: "abierto", etiqueta: horario };
      }
      continue;
    }

    const m = seg.match(/^([A-Z]+(?:-[A-Z]+)?(?:,[A-Z]+)*)\s*:\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!m) continue;

    const diasAplicados = expandirDias(m[1]);
    if (!diasAplicados.includes(diaJs)) continue;

    const minInicio = parseInt(m[2]) * 60 + parseInt(m[3]);
    const minFin = parseInt(m[4]) * 60 + parseInt(m[5]);
    const estaAbierto = minAhora >= minInicio && minAhora < minFin;
    return { estado: estaAbierto ? "abierto" : "cerrado", etiqueta: horario };
  }

  return { estado: "desconocido", etiqueta: horario };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function StationDetail({
  gasolinera,
  combustibleActivo,
  gasolinerasRadio,
  vehiculo,
  esFavorita,
  onToggleFavorita,
  alerta,
  onGuardarAlerta,
  onEliminarAlerta,
  resumenDiario,
  onSetResumenDiario,
  onClose,
}: StationDetailProps) {
  const stats = calcularEstadisticas(gasolinerasRadio, combustibleActivo);
  const ahorro = vehiculo ? calcularAhorro(gasolinera, vehiculo, stats) : null;
  const precioActivo = obtenerPrecio(gasolinera, combustibleActivo);

  const umbralInicial = alerta
    ? alerta.umbral.toFixed(3)
    : precioActivo
    ? (precioActivo - 0.01).toFixed(3)
    : "";
  const [umbralInput, setUmbralInput] = useState(umbralInicial);

  const urlGoogleMaps = `https://www.google.com/maps/dir/?api=1&destination=${gasolinera.latitud},${gasolinera.longitud}`;
  const urlAppleMaps = `https://maps.apple.com/?daddr=${gasolinera.latitud},${gasolinera.longitud}`;

  const { estado, etiqueta } = parsearHorario(gasolinera.horario);

  const guardarAlertaLocal = () => {
    const umbral = parseFloat(umbralInput);
    if (isNaN(umbral) || umbral <= 0) return;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    onGuardarAlerta({ gasolineraId: gasolinera.id, combustible: combustibleActivo, umbral });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Cabecera */}
      <div className="flex items-start justify-between p-4 border-b border-gray-100">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-gray-900 text-base leading-tight">{gasolinera.nombre}</h2>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{gasolinera.direccion}, {gasolinera.localidad}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={onToggleFavorita}
            aria-label={esFavorita ? "Quitar de favoritas" : "Añadir a favoritas"}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Star className={cn("w-4 h-4", esFavorita ? "fill-amber-400 text-amber-400" : "text-gray-400")} />
          </button>
          <button
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Calculadora de ahorro */}
        {ahorro && vehiculo && (
          <div className="m-4 p-4 bg-green-50 rounded-2xl space-y-2">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Con tu {vehiculo.nombre}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-green-600">Precio/litro</p>
                <p className="text-lg font-bold text-green-700">{formatPrecio(ahorro.precioLitro)}</p>
              </div>
              <div>
                <p className="text-xs text-green-600">Llenar depósito</p>
                <p className="text-lg font-bold text-green-700">{formatEuros(ahorro.costeDeposito)}</p>
              </div>
              <div>
                <p className="text-xs text-green-600">Ahorro vs. más cara</p>
                <p className={cn("text-base font-bold", ahorro.ahorroVsMaximo > 0 ? "text-green-600" : "text-gray-400")}>
                  {ahorro.ahorroVsMaximo > 0 ? `-${formatEuros(ahorro.ahorroVsMaximo)}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-green-600">Ahorro vs. media</p>
                <p className={cn("text-base font-bold", ahorro.ahorroVsMedia > 0 ? "text-green-600" : ahorro.ahorroVsMedia < 0 ? "text-red-500" : "text-gray-400")}>
                  {ahorro.ahorroVsMedia !== 0
                    ? `${ahorro.ahorroVsMedia > 0 ? "-" : "+"}${formatEuros(Math.abs(ahorro.ahorroVsMedia))}`
                    : "En la media"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Comparativa €/litro */}
        {precioActivo && stats.minimo > 0 && gasolinerasRadio.length > 1 && (() => {
          const diffVsMin = precioActivo - stats.minimo;
          const diffVsMax = stats.maximo - precioActivo;
          const clasificacion = clasificarPrecio(precioActivo, stats);
          const bgColor = clasificacion === "barato" ? "bg-green-50" : clasificacion === "caro" ? "bg-red-50" : "bg-amber-50";
          const labelColor = clasificacion === "barato" ? "text-green-600" : clasificacion === "caro" ? "text-red-500" : "text-amber-600";
          const label = clasificacion === "barato" ? "Precio bajo" : clasificacion === "caro" ? "Precio alto" : "Precio medio";
          return (
            <div className={cn("mx-4 mb-3 p-3 rounded-2xl", bgColor)}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Comparativa €/litro</p>
                <span className={cn("text-xs font-semibold", labelColor)}>{label}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">vs. la más barata</p>
                  <p className={cn("text-sm font-bold", diffVsMin < 0.001 ? "text-green-600" : "text-red-500")}>
                    {diffVsMin < 0.001 ? "Es la más barata" : `+${diffVsMin.toFixed(3)} €/L`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">vs. la más cara</p>
                  <p className={cn("text-sm font-bold", diffVsMax > 0.001 ? "text-green-600" : "text-gray-400")}>
                    {diffVsMax > 0.001 ? `-${diffVsMax.toFixed(3)} €/L` : "Es la más cara"}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Todos los precios */}
        <div className="px-4 pb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Precios</p>
          <div className="space-y-1">
            {(Object.keys(COMBUSTIBLES) as TipoCombustible[]).map((tipo) => {
              const precio = gasolinera.precios[COMBUSTIBLES[tipo].key as keyof typeof gasolinera.precios];
              if (!precio) return null;
              return (
                <div key={tipo} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <Fuel className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm text-gray-700">{COMBUSTIBLES[tipo].label}</span>
                    {tipo === combustibleActivo && <Badge variante="gris">seleccionado</Badge>}
                  </div>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {formatPrecio(precio)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Otros combustibles */}
        {(gasolinera.precios.dieselPremium !== undefined ||
          gasolinera.precios.gnc !== undefined ||
          gasolinera.precios.gnl !== undefined) && (
          <div className="px-4 pb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Más combustibles</p>
            <div className="space-y-1">
              {gasolinera.precios.dieselPremium && (
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-sm text-gray-700">Diésel Premium</span>
                  <span className="text-sm font-medium tabular-nums">{formatPrecio(gasolinera.precios.dieselPremium)}</span>
                </div>
              )}
              {gasolinera.precios.gnc && (
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-sm text-gray-700">GNC</span>
                  <span className="text-sm font-medium tabular-nums">{formatPrecio(gasolinera.precios.gnc)}</span>
                </div>
              )}
              {gasolinera.precios.gnl && (
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-sm text-gray-700">GNL</span>
                  <span className="text-sm font-medium tabular-nums">{formatPrecio(gasolinera.precios.gnl)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Horario */}
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Horario</p>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {estado === "abierto" && <Badge variante="verde">Abierto ahora</Badge>}
                {estado === "cerrado" && <Badge variante="rojo">Cerrado ahora</Badge>}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{etiqueta}</p>
            </div>
          </div>
        </div>

        {/* Alertas de precio */}
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Alertas de precio</p>
          <div className="bg-gray-50 rounded-2xl p-3 space-y-3">
            {/* Umbral */}
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1">Avisarme si baja de</span>
              <input
                type="number"
                step="0.001"
                min="0.5"
                max="3"
                value={umbralInput}
                onChange={(e) => setUmbralInput(e.target.value)}
                className="w-20 text-sm text-right bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <span className="text-xs text-gray-500">€/L</span>
            </div>

            {/* Resumen diario */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Resumen diario de precios</span>
              <button
                onClick={() => onSetResumenDiario(!resumenDiario)}
                role="switch"
                aria-checked={resumenDiario}
                className={cn(
                  "relative w-9 h-5 rounded-full transition-colors flex-shrink-0",
                  resumenDiario ? "bg-green-500" : "bg-gray-300"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                    resumenDiario && "translate-x-4"
                  )}
                />
              </button>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={guardarAlertaLocal}
                className="flex-1 py-2 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors"
              >
                {alerta ? "Actualizar alerta" : "Activar alerta"}
              </button>
              {alerta && (
                <button
                  onClick={onEliminarAlerta}
                  className="py-2 px-3 bg-gray-100 text-gray-500 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors"
                >
                  <BellOff className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Última actualización */}
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-400">
            Precios actualizados: {gasolinera.ultimaActualizacion}
          </p>
        </div>
      </div>

      {/* Botones de navegación */}
      <div className="p-4 border-t border-gray-100 flex gap-2">
        <a href={urlGoogleMaps} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button variante="primario" className="w-full gap-1.5">
            <Navigation2 className="w-4 h-4" />
            Google Maps
          </Button>
        </a>
        <a href={urlAppleMaps} target="_blank" rel="noopener noreferrer">
          <Button variante="secundario" className="gap-1.5">
            <ExternalLink className="w-4 h-4" />
            Apple
          </Button>
        </a>
      </div>
    </div>
  );
}
