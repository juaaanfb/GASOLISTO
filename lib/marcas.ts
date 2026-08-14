// Marcas detectables por nombre de gasolinera (campo "Rótulo" del MITECO).
// Incluye las principales cadenas de España — usado por el filtro de marca
// del planificador de viaje. No todas tienen programa de fidelidad propio
// (ver PROGRAMAS_DESCUENTO más abajo, un subconjunto de esta lista).
export type Marca =
  | "repsol"
  | "cepsa_moeve"
  | "bp"
  | "shell"
  | "carrefour"
  | "galp"
  | "alcampo"
  | "ballenoil"
  | "plenergy";

export interface InfoMarca {
  marca: Marca;
  nombre: string;
}

export const MARCAS: InfoMarca[] = [
  { marca: "repsol", nombre: "Repsol" },
  { marca: "cepsa_moeve", nombre: "Cepsa / Moeve" },
  { marca: "bp", nombre: "BP" },
  { marca: "shell", nombre: "Shell" },
  { marca: "carrefour", nombre: "Carrefour" },
  { marca: "galp", nombre: "Galp" },
  { marca: "alcampo", nombre: "Alcampo" },
  { marca: "ballenoil", nombre: "Ballenoil" },
  { marca: "plenergy", nombre: "Plenergy" },
];

const PATRONES: Record<Marca, RegExp> = {
  repsol: /\brepsol\b/i,
  cepsa_moeve: /\b(cepsa|moeve)\b/i,
  bp: /\bbp\b/i,
  shell: /\bshell\b/i,
  carrefour: /\bcarrefour\b/i,
  galp: /\bgalp\b/i,
  alcampo: /\balcampo\b/i,
  ballenoil: /\bballenoil\b/i,
  plenergy: /\bplenergy\b/i,
};

// Detecta la marca de una gasolinera a partir de su nombre (campo "Rótulo"
// del MITECO). Algunas estaciones llevan el nombre del gestor detrás del
// rótulo (p.ej. "REPSOL ALHAMBRA"), por eso se busca coincidencia parcial
// con límites de palabra, no igualdad exacta.
export function detectarMarca(nombreEstacion: string): Marca | null {
  for (const marca of Object.keys(PATRONES) as Marca[]) {
    if (PATRONES[marca].test(nombreEstacion)) return marca;
  }
  return null;
}

export interface ProgramaDescuento {
  marca: Marca;
  nombre: string;
  app: string;
  referencia: string;
}

// Subconjunto de MARCAS con programa de fidelidad/descuento propio
// conocido. Deliberadamente NO incluye Ballenoil, Alcampo, Galp o Plenergy:
// su modelo es precio bajo fijo mostrado en el cartel, sin tarjeta ni app
// de puntos, así que listarlas aquí sugeriría un descuento que no existe.
// Rangos orientativos según lo publicado por cada marca a fecha de esta
// implementación; el usuario introduce su propio importe en vez de asumir
// un número fijo.
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
  {
    marca: "carrefour",
    nombre: "Carrefour",
    app: "Club Carrefour / Pass Carrefour",
    referencia: "Orientativo: variable según promoción activa de la tarjeta",
  },
];

// Precio con el descuento personal aplicado (si el usuario ha configurado
// uno para la marca de esa gasolinera). Nunca sustituye al precio oficial:
// solo se usa como dato adicional en la UI.
export function precioConDescuento(
  precio: number,
  nombreEstacion: string,
  descuentos: Partial<Record<Marca, number>>
): number | null {
  const marca = detectarMarca(nombreEstacion);
  if (!marca) return null;
  const descuentoCts = descuentos[marca];
  if (!descuentoCts || descuentoCts <= 0) return null;
  return Math.max(0, Math.round((precio - descuentoCts / 100) * 1000) / 1000);
}
