import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: "primario" | "secundario" | "fantasma";
  tamano?: "sm" | "md" | "lg";
}

const variantes = {
  primario: "bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700",
  secundario: "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300",
  fantasma: "text-gray-600 hover:bg-gray-100 active:bg-gray-200",
};

const tamanos = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base",
};

export function Button({
  variante = "primario",
  tamano = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium",
        "transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed",
        variantes[variante],
        tamanos[tamano],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
