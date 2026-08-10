"use client";
import { Car, Plus, ChevronRight, Check, X } from "lucide-react";
import type { Vehiculo } from "@/types";
import { COMBUSTIBLES } from "@/types";
import { cn } from "@/lib/utils";

interface VehicleSelectorProps {
  vehiculos: Vehiculo[];
  activoId: string;
  onSeleccionar: (id: string) => void;
  onEditar: (v: Vehiculo) => void;
  onNuevo: () => void;
  onCerrar: () => void;
}

export function VehicleSelector({
  vehiculos,
  activoId,
  onSeleccionar,
  onEditar,
  onNuevo,
  onCerrar,
}: VehicleSelectorProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-start justify-between p-4 border-b border-gray-100">
        <div>
          <h2 className="font-bold text-gray-900 text-base">Mis vehículos</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            El vehículo activo se usa para calcular el ahorro
          </p>
        </div>
        <button
          onClick={onCerrar}
          aria-label="Cerrar vehículos"
          className="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {vehiculos.map((v) => (
          <div
            key={v.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3.5 border-b border-gray-50",
              v.id === activoId && "bg-green-50"
            )}
          >
            <button
              onClick={() => onSeleccionar(v.id)}
              className="flex-1 flex items-center gap-3 text-left"
            >
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                v.id === activoId ? "bg-green-100" : "bg-gray-100"
              )}>
                {v.id === activoId
                  ? <Check className="w-4 h-4 text-green-600" />
                  : <Car className="w-4 h-4 text-gray-500" />
                }
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{v.nombre}</p>
                <p className="text-xs text-gray-400">
                  {COMBUSTIBLES[v.combustible].label} · {v.consumo} L/100km · {v.deposito}L
                </p>
              </div>
            </button>
            <button
              onClick={() => onEditar(v)}
              aria-label={`Editar ${v.nombre}`}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={onNuevo}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Añadir vehículo
        </button>
      </div>
    </div>
  );
}
