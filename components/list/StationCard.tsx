"use client";
import { MapPin, Navigation, TrendingDown, Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Gasolinera, TipoCombustible, Vehiculo } from "@/types";
import type { ClasificacionPrecio } from "@/lib/calculos";
import {
  obtenerPrecio,
  clasificarPrecio,
  calcularAhorro,
  formatPrecio,
  formatEuros,
  formatDistancia,
} from "@/lib/calculos";
import { cn } from "@/lib/utils";

interface StationCardProps {
  gasolinera: Gasolinera;
  combustible: TipoCombustible;
  stats: { media: number; maximo: number; minimo: number };
  vehiculo?: Vehiculo;
  posicion: number;
  seleccionada: boolean;
  esFavorita: boolean;
  onClick: () => void;
  onToggleFavorita: (e: React.MouseEvent) => void;
}

const coloresPrecio: Record<ClasificacionPrecio, string> = {
  barato: "text-green-600",
  medio: "text-amber-600",
  caro: "text-red-500",
};

export function StationCard({
  gasolinera,
  combustible,
  stats,
  vehiculo,
  posicion,
  seleccionada,
  esFavorita,
  onClick,
  onToggleFavorita,
}: StationCardProps) {
  const precio = obtenerPrecio(gasolinera, combustible);
  if (!precio) return null;

  const clasificacion = clasificarPrecio(precio, stats);
  const ahorro = vehiculo ? calcularAhorro(gasolinera, vehiculo, stats) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "w-full text-left px-4 py-3.5 border-b border-gray-50 cursor-pointer",
        "transition-colors hover:bg-gray-50 active:bg-gray-100",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-500 focus-visible:outline-offset-[-2px]",
        seleccionada && "bg-green-50 border-l-2 border-l-green-500",
        esFavorita && !seleccionada && "border-l-2 border-l-amber-400"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Posición + info principal */}
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center mt-0.5">
            {posicion}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
              {gasolinera.nombre}
              {esFavorita && <Star className="inline w-3 h-3 ml-1 fill-amber-400 text-amber-400 -mt-0.5" />}
            </p>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{gasolinera.localidad}</span>
              {gasolinera.distancia !== undefined && (
                <>
                  <span>·</span>
                  <Navigation className="w-3 h-3 flex-shrink-0" />
                  <span>{formatDistancia(gasolinera.distancia)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Precio + estrella */}
        <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
          <button
            onClick={onToggleFavorita}
            className="p-1 -mr-1 -mt-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label={esFavorita ? "Quitar de favoritas" : "Añadir a favoritas"}
          >
            <Star className={cn("w-4 h-4", esFavorita ? "fill-amber-400 text-amber-400" : "text-gray-300")} />
          </button>
          <p className={cn("text-lg font-bold leading-tight tabular-nums", coloresPrecio[clasificacion])}>
            {precio.toFixed(3)}
          </p>
          <p className="text-xs text-gray-400">€/L</p>
        </div>
      </div>

      {/* Fila de ahorro */}
      {ahorro && ahorro.ahorroVsMedia !== 0 && (
        <div className="mt-2 flex items-center gap-1.5 ml-9">
          <TrendingDown className="w-3.5 h-3.5 text-green-600" />
          <span className="text-xs text-green-600 font-medium">
            Llenar: {formatEuros(ahorro.costeDeposito)}
          </span>
          {ahorro.ahorroVsMedia > 0 && (
            <Badge variante="verde">
              -{formatEuros(ahorro.ahorroVsMedia)} vs media
            </Badge>
          )}
          {ahorro.ahorroVsMedia < 0 && (
            <Badge variante="rojo">
              +{formatEuros(Math.abs(ahorro.ahorroVsMedia))} vs media
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
