import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variante?: "verde" | "amarillo" | "rojo" | "gris";
  className?: string;
}

const variantes = {
  verde: "bg-green-100 text-green-700",
  amarillo: "bg-amber-100 text-amber-700",
  rojo: "bg-red-100 text-red-700",
  gris: "bg-gray-100 text-gray-600",
};

export function Badge({ children, variante = "gris", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        variantes[variante],
        className
      )}
    >
      {children}
    </span>
  );
}
