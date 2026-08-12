"use client";
import { useRef, useEffect } from "react";
import { StationCard } from "./StationCard";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import type { Gasolinera, Filtros, Vehiculo } from "@/types";
import { COMBUSTIBLES } from "@/types";
import type { Descuentos } from "@/hooks/useDescuentos";

interface StationListProps {
  gasolineras: Gasolinera[];
  totalDisponible?: number;
  filtros: Filtros;
  stats: { media: number; maximo: number; minimo: number };
  vehiculo?: Vehiculo;
  seleccionadaId: string | null;
  cargando: boolean;
  error: string | null;
  ultimaActualizacion: string | null;
  favoritas: Set<string>;
  descuentos?: Descuentos;
  onSelect: (gasolinera: Gasolinera) => void;
  onToggleFavorita: (id: string) => void;
  onRefetch?: () => void;
}

export function StationList({
  gasolineras,
  totalDisponible,
  filtros,
  stats,
  vehiculo,
  seleccionadaId,
  cargando,
  error,
  ultimaActualizacion,
  favoritas,
  descuentos,
  onSelect,
  onToggleFavorita,
  onRefetch,
}: StationListProps) {
  const refSeleccionada = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refSeleccionada.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [seleccionadaId]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Spinner className="w-8 h-8" />
        <p className="text-sm text-gray-400">Cargando gasolineras de España…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 px-8 text-center">
        <p className="text-sm font-medium text-gray-700">Error al cargar datos</p>
        <p className="text-xs text-gray-400">{error}</p>
        {onRefetch && (
          <Button variante="secundario" tamano="sm" onClick={onRefetch}>
            Reintentar
          </Button>
        )}
      </div>
    );
  }

  if (gasolineras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 px-8 text-center">
        <p className="text-sm font-medium text-gray-700">Sin resultados</p>
        <p className="text-xs text-gray-400">
          No hay gasolineras con precio de {COMBUSTIBLES[filtros.combustible].label} en el radio seleccionado.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {gasolineras.length} gasolineras
        </span>
        {ultimaActualizacion && (
          <span className="text-xs text-gray-400">
            Act. {ultimaActualizacion.split(" ")[0]}
          </span>
        )}
      </div>

      {totalDisponible !== undefined && totalDisponible > gasolineras.length && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-700">
            Mostrando las {gasolineras.length} más baratas de {totalDisponible.toLocaleString("es-ES")}. Reduce el radio para ver solo las de cerca.
          </p>
        </div>
      )}

      {gasolineras.map((g, i) => (
        <div
          key={g.id}
          ref={g.id === seleccionadaId ? refSeleccionada : undefined}
        >
          <StationCard
            gasolinera={g}
            combustible={filtros.combustible}
            stats={stats}
            vehiculo={vehiculo}
            posicion={i + 1}
            seleccionada={g.id === seleccionadaId}
            esFavorita={favoritas.has(g.id)}
            descuentos={descuentos}
            onClick={() => onSelect(g)}
            onToggleFavorita={(e) => { e.stopPropagation(); onToggleFavorita(g.id); }}
          />
        </div>
      ))}
    </div>
  );
}
