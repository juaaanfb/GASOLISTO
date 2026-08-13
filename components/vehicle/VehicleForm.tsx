"use client";
import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Vehiculo, TipoCombustible } from "@/types";
import { COMBUSTIBLES } from "@/types";
import { cn } from "@/lib/utils";

interface VehicleFormProps {
  vehiculo: Vehiculo;
  esNuevo?: boolean;
  onGuardar: (v: Vehiculo) => void;
  onEliminar?: () => void;
  onCancelar: () => void;
}

interface Errores {
  nombre?: string;
  consumo?: string;
  deposito?: string;
}

export function VehicleForm({ vehiculo, esNuevo = false, onGuardar, onEliminar, onCancelar }: VehicleFormProps) {
  const [nombre, setNombre] = useState(vehiculo.nombre);
  const [combustible, setCombustible] = useState<TipoCombustible>(vehiculo.combustible);
  // Consumo y depósito se editan como texto libre (no como number ligado al
  // valor numérico ya validado): así se puede borrar el campo del todo sin
  // que un "0" intermedio se cuele y quede delante de lo siguiente que se
  // escriba. Solo se convierten a número al guardar.
  const [consumoTexto, setConsumoTexto] = useState(String(vehiculo.consumo));
  const [depositoTexto, setDepositoTexto] = useState(String(vehiculo.deposito));
  const [errores, setErrores] = useState<Errores>({});

  const limpiarError = (k: keyof Errores) => setErrores((e) => ({ ...e, [k]: undefined }));

  const validar = (): { consumo: number; deposito: number } | null => {
    const consumo = parseFloat(consumoTexto.replace(",", ".")) || 0;
    const deposito = parseFloat(depositoTexto.replace(",", ".")) || 0;
    const nuevos: Errores = {};
    if (!nombre.trim()) nuevos.nombre = "El nombre no puede estar vacío";
    if (consumo <= 0) nuevos.consumo = "El consumo debe ser mayor que 0";
    if (deposito <= 0) nuevos.deposito = "La capacidad debe ser mayor que 0";
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0 ? { consumo, deposito } : null;
  };

  const handleGuardar = () => {
    const valores = validar();
    if (!valores) return;
    onGuardar({ ...vehiculo, nombre, combustible, ...valores });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 text-base">
          {esNuevo ? "Nuevo vehículo" : "Editar vehículo"}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Nombre */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); limpiarError("nombre"); }}
            placeholder="Mi Seat Ibiza"
            className={cn(
              "w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20",
              errores.nombre ? "border-red-400 focus:ring-red-400/20" : "border-gray-200 focus:border-gray-400"
            )}
          />
          {errores.nombre && <p className="text-xs text-red-500">{errores.nombre}</p>}
        </div>

        {/* Combustible */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Combustible</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(COMBUSTIBLES) as TipoCombustible[]).map((tipo) => (
              <button
                key={tipo}
                onClick={() => setCombustible(tipo)}
                className={cn(
                  "px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors text-left",
                  combustible === tipo
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                )}
              >
                {COMBUSTIBLES[tipo].label}
              </button>
            ))}
          </div>
        </div>

        {/* Consumo */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Consumo medio <span className="text-gray-400 font-normal normal-case">(L/100km)</span>
          </label>
          <input
            type="number"
            value={consumoTexto}
            onChange={(e) => { setConsumoTexto(e.target.value); limpiarError("consumo"); }}
            min={1}
            max={30}
            step={0.1}
            className={cn(
              "w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20",
              errores.consumo ? "border-red-400 focus:ring-red-400/20" : "border-gray-200 focus:border-gray-400"
            )}
          />
          {errores.consumo
            ? <p className="text-xs text-red-500">{errores.consumo}</p>
            : <p className="text-xs text-gray-400">Ej: 6.5 para un coche medio de gasolina</p>
          }
        </div>

        {/* Depósito */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Capacidad del depósito <span className="text-gray-400 font-normal normal-case">(litros)</span>
          </label>
          <input
            type="number"
            value={depositoTexto}
            onChange={(e) => { setDepositoTexto(e.target.value); limpiarError("deposito"); }}
            min={10}
            max={150}
            step={1}
            className={cn(
              "w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20",
              errores.deposito ? "border-red-400 focus:ring-red-400/20" : "border-gray-200 focus:border-gray-400"
            )}
          />
          {errores.deposito && <p className="text-xs text-red-500">{errores.deposito}</p>}
        </div>
      </div>

      {/* Acciones */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <div className="flex gap-2">
          <Button variante="secundario" className="flex-1" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button variante="primario" className="flex-1 gap-1.5" onClick={handleGuardar}>
            <Check className="w-4 h-4" />
            Guardar
          </Button>
        </div>
        {onEliminar && (
          <Button variante="fantasma" className="w-full text-red-500 hover:bg-red-50 gap-1.5" onClick={onEliminar}>
            <Trash2 className="w-4 h-4" />
            Eliminar vehículo
          </Button>
        )}
      </div>
    </div>
  );
}
