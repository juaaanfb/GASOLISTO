"use client";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Filtros, TipoCombustible, RadioBusqueda } from "@/types";
import { COMBUSTIBLES, RADIOS } from "@/types";

interface FilterBarProps {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
  soloFavoritas: boolean;
  onToggleSoloFavoritas: () => void;
}

export function FilterBar({ filtros, onChange, soloFavoritas, onToggleSoloFavoritas }: FilterBarProps) {
  const setCombustible = (c: TipoCombustible) =>
    onChange({ ...filtros, combustible: c });
  const setRadio = (r: RadioBusqueda) => onChange({ ...filtros, radio: r });

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-3">
      {/* Selector de combustible + favoritas */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {(Object.keys(COMBUSTIBLES) as TipoCombustible[]).map((key) => (
          <button
            key={key}
            onClick={() => setCombustible(key)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              filtros.combustible === key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {COMBUSTIBLES[key].label}
          </button>
        ))}
        <button
          onClick={onToggleSoloFavoritas}
          className={cn(
            "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            soloFavoritas
              ? "bg-amber-400 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", soloFavoritas ? "fill-white" : "")} />
          Favoritas
        </button>
      </div>

      {/* Selector de radio */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        <span className="flex-shrink-0 text-xs text-gray-400 self-center mr-1">Radio:</span>
        {RADIOS.map(({ value, label }) => (
          <button
            key={String(value)}
            onClick={() => setRadio(value)}
            className={cn(
              "flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              filtros.radio === value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
