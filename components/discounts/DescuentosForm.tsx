"use client";
import { useState } from "react";
import { X, Percent } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PROGRAMAS_DESCUENTO } from "@/lib/marcas";
import type { Descuentos } from "@/hooks/useDescuentos";

interface DescuentosFormProps {
  descuentos: Descuentos;
  onGuardar: (d: Descuentos) => void;
  onCerrar: () => void;
}

export function DescuentosForm({ descuentos, onGuardar, onCerrar }: DescuentosFormProps) {
  const [form, setForm] = useState<Descuentos>(descuentos);

  const set = (marca: keyof Descuentos, valor: string) => {
    const num = parseFloat(valor);
    setForm((f) => ({ ...f, [marca]: isNaN(num) || num <= 0 ? undefined : num }));
  };

  const handleGuardar = () => {
    onGuardar(form);
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />

      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-card-hover max-h-[90vh] overflow-y-auto">
        <div className="p-5 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <Percent className="w-4.5 h-4.5 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base leading-tight">Mis descuentos</h2>
              <p className="text-xs text-gray-400">Waylet, Gow, tarjetas de fidelización…</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="p-1.5 -mr-1.5 -mt-1.5 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <p className="px-5 text-xs text-gray-500 leading-relaxed mb-2">
          Indica cuántos céntimos por litro te descuenta cada programa. Lo aplicaremos
          solo como referencia junto al precio oficial — nunca lo sustituye.
        </p>

        <div className="px-5 py-3 space-y-4">
          {PROGRAMAS_DESCUENTO.map(({ marca, nombre, app, referencia }) => (
            <div key={marca} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{nombre}</p>
                  <p className="text-xs text-gray-400 truncate">{app}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder="0"
                    value={form[marca] ?? ""}
                    onChange={(e) => set(marca, e.target.value)}
                    className="w-16 text-right px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                  />
                  <span className="text-xs text-gray-500">cts/L</span>
                </div>
              </div>
              <p className="text-xs text-gray-400">{referencia}</p>
            </div>
          ))}
        </div>

        <div className="p-5 pt-3">
          <Button variante="primario" className="w-full" onClick={handleGuardar}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
