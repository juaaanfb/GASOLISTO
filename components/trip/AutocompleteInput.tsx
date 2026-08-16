"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buscarLugares, type LugarSugerido } from "@/lib/geocoding";
import type { Coordenadas } from "@/types";

interface AutocompleteInputProps {
  value: string;
  onChange: (v: string) => void;
  onSeleccionar?: (lugar: LugarSugerido) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder: string;
  icon: React.ReactNode;
  action?: { label: string; onClick: () => void };
  bias?: Coordenadas;
  soloLocalidades?: boolean;
  className?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  onSeleccionar,
  onKeyDown,
  placeholder,
  icon,
  action,
  bias,
  soloLocalidades,
  className,
}: AutocompleteInputProps) {
  const [sugerencias, setSugerencias] = useState<LugarSugerido[]>([]);
  const [abierto, setAbierto] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const buscar = useCallback((texto: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (texto.length < 2) {
      setSugerencias([]);
      setAbierto(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const resultados = await buscarLugares(texto, { bias, soloLocalidades }).catch(() => []);
      setSugerencias(resultados);
      setAbierto(resultados.length > 0);
    }, 350);
  }, [bias, soloLocalidades]);

  useEffect(() => {
    buscar(value);
  }, [value, buscar]);

  // Cerrar al click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const seleccionar = (s: LugarSugerido) => {
    onChange(s.label);
    onSeleccionar?.(s);
    setSugerencias([]);
    setAbierto(false);
  };

  return (
    <div ref={contenedorRef} className={cn("relative", className)}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          {icon}
        </span>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { if (sugerencias.length > 0) setAbierto(true); }}
          onKeyDown={onKeyDown}
          className="w-full pl-9 pr-24 py-3 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {action && (
            <button
              type="button"
              onClick={() => { action.onClick(); setSugerencias([]); setAbierto(false); }}
              className="text-xs text-green-600 font-medium px-1 py-0.5 hover:text-green-700 whitespace-nowrap"
            >
              {action.label}
            </button>
          )}
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setSugerencias([]); setAbierto(false); }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown de sugerencias */}
      {abierto && sugerencias.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
          {sugerencias.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => seleccionar(s)}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0 truncate"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
