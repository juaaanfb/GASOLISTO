"use client";
import { Map, List, Route, Car, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabActiva = "mapa" | "lista" | "viaje" | "vehiculos";

interface NavBarProps {
  tabActiva: TabActiva;
  onChange: (tab: TabActiva) => void;
  aviso?: string | null;
}

const tabs = [
  { id: "mapa" as const, label: "Mapa", Icon: Map },
  { id: "lista" as const, label: "Lista", Icon: List },
  { id: "viaje" as const, label: "Viaje", Icon: Route },
  { id: "vehiculos" as const, Icon: Car, label: "Vehículo" },
];

export function NavBar({ tabActiva, onChange, aviso }: NavBarProps) {
  return (
    <div className="bg-white border-t border-gray-100 safe-area-bottom">
      {aviso && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 truncate">{aviso}</p>
        </div>
      )}
      <nav className="flex">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              "relative flex-1 flex flex-col items-center gap-1 py-3 transition-colors",
              tabActiva === id ? "text-green-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            {tabActiva === id && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-green-600" />
            )}
            <Icon className="w-5 h-5" strokeWidth={tabActiva === id ? 2.5 : 1.8} />
            <span className={cn("text-xs", tabActiva === id ? "font-semibold" : "font-normal")}>
              {label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
