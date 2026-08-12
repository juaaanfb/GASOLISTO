export type MarcaDescuento = "repsol" | "cepsa_moeve" | "bp" | "shell";

export interface ProgramaDescuento {
  marca: MarcaDescuento;
  nombre: string;
  app: string;
  referencia: string;
}

// Rangos orientativos de descuento por litro, según lo publicado por cada
// marca a fecha de esta implementación. Varían mucho según lo que cada
// persona tenga contratado, por eso el usuario introduce su propio importe
// en vez de asumir un número fijo.
export const PROGRAMAS_DESCUENTO: ProgramaDescuento[] = [
  {
    marca: "repsol",
    nombre: "Repsol",
    app: "Waylet",
    referencia: "Orientativo: 5–20 cts/L según luz/gas contratados con Repsol",
  },
  {
    marca: "cepsa_moeve",
    nombre: "Cepsa / Moeve",
    app: "Gow + Club Carrefour",
    referencia: "Orientativo: 5–12 cts/L combinando Gow y Club Carrefour",
  },
  {
    marca: "bp",
    nombre: "BP",
    app: "Mi BP",
    referencia: "Orientativo: hasta 10 cts/L",
  },
  {
    marca: "shell",
    nombre: "Shell",
    app: "Shell / promociones",
    referencia: "Orientativo: 5–10 cts/L según promoción",
  },
];

const PATRONES: Record<MarcaDescuento, RegExp> = {
  repsol: /\brepsol\b/i,
  cepsa_moeve: /\b(cepsa|moeve)\b/i,
  bp: /\bbp\b/i,
  shell: /\bshell\b/i,
};

// Detecta la marca de una gasolinera a partir de su nombre (campo "Rótulo"
// del MITECO). Algunas estaciones llevan el nombre del gestor detrás del
// rótulo (p.ej. "REPSOL ALHAMBRA"), por eso se busca coincidencia parcial
// con límites de palabra, no igualdad exacta.
export function detectarMarca(nombreEstacion: string): MarcaDescuento | null {
  for (const marca of Object.keys(PATRONES) as MarcaDescuento[]) {
    if (PATRONES[marca].test(nombreEstacion)) return marca;
  }
  return null;
}

// Precio con el descuento personal aplicado (si el usuario ha configurado
// uno para la marca de esa gasolinera). Nunca sustituye al precio oficial:
// solo se usa como dato adicional en la UI.
export function precioConDescuento(
  precio: number,
  nombreEstacion: string,
  descuentos: Partial<Record<MarcaDescuento, number>>
): number | null {
  const marca = detectarMarca(nombreEstacion);
  if (!marca) return null;
  const descuentoCts = descuentos[marca];
  if (!descuentoCts || descuentoCts <= 0) return null;
  return Math.max(0, Math.round((precio - descuentoCts / 100) * 1000) / 1000);
}
