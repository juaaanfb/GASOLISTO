"use client";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  abierto: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  altura?: "media" | "completa" | "auto";
  className?: string;
}

const alturas = {
  media: "h-[55vh]",
  completa: "h-[90vh]",
  auto: "max-h-[90vh]",
};

export function BottomSheet({
  abierto,
  onClose,
  children,
  altura = "media",
  className,
}: BottomSheetProps) {
  // Solo bloquear scroll si el sheet tiene overlay con posibilidad de cerrarse
  useEffect(() => {
    document.body.style.overflow = (abierto && !!onClose) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [abierto, onClose]);

  return (
    <>
      {/* Overlay */}
      {abierto && onClose && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-16 left-0 right-0 z-50",
          "bg-white rounded-t-3xl shadow-bottom",
          "transition-transform duration-300 ease-out",
          "overflow-hidden flex flex-col",
          alturas[altura],
          abierto ? "translate-y-0" : "translate-y-full",
          className
        )}
      >
        {/* Handle visual */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </>
  );
}
