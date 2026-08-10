// ─── Respuesta bruta de la API MITECO ─────────────────────────────────────────

export interface MitecoEstacion {
  "C.P.": string;
  Dirección: string;
  Horario: string;
  Latitud: string;
  "Localidad": string;
  "Longitud (WGS84)": string;
  Margen: string;
  Municipio: string;
  "PrecioProducto": string;
  Provincia: string;
  Remisión: string;
  Rótulo: string;
  "Tipo Venta": string;
  IDEESS: string;
  IDMunicipio: string;
  IDProvincia: string;
  IDCCAA: string;
  // Precios por tipo de combustible (nombres de campo actualizados 2026)
  "Precio Gasolina 95 E5": string;
  "Precio Gasolina 95 E5 Premium": string;
  "Precio Gasolina 98 E5": string;
  "Precio Gasolina 98 E10": string;
  "Precio Gasoleo A": string;
  "Precio Gasoleo B": string;
  "Precio Gasoleo Premium": string;
  "Precio Gases licuados del petróleo": string;
  "Precio Gas Natural Comprimido": string;
  "Precio Gas Natural Licuado": string;
  "% BioEtanol": string;
  "% Éster metílico": string;
}

export interface MitecoRespuesta {
  Fecha: string;
  ListaEESSPrecio: MitecoEstacion[];
  Nota: string;
  ResultadoConsulta: string;
}

// ─── Modelo interno de la app ──────────────────────────────────────────────────

export interface Gasolinera {
  id: string;
  nombre: string;
  direccion: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  latitud: number;
  longitud: number;
  horario: string;
  precios: PreciosCombustible;
  distancia?: number; // km desde el usuario
  ultimaActualizacion: string;
}

export interface PreciosCombustible {
  gasolina95?: number;
  gasolina95Premium?: number;
  gasolina98?: number;
  gasolina98E10?: number;
  diesel?: number;
  dieselB?: number;
  dieselPremium?: number;
  glp?: number;
  gnc?: number;
  gnl?: number;
}

// ─── Tipos de combustible que muestra la app ───────────────────────────────────

export type TipoCombustible =
  | "gasolina95"
  | "gasolina98"
  | "diesel"
  | "glp";

export const COMBUSTIBLES: Record<TipoCombustible, { label: string; key: keyof PreciosCombustible }> = {
  gasolina95: { label: "Gasolina 95", key: "gasolina95" },
  gasolina98: { label: "Gasolina 98", key: "gasolina98" },
  diesel: { label: "Diésel", key: "diesel" },
  glp: { label: "GLP", key: "glp" },
};

// ─── Radio de búsqueda ─────────────────────────────────────────────────────────

export type RadioBusqueda = 2 | 5 | 10 | 20 | null;

export const RADIOS: { value: RadioBusqueda; label: string }[] = [
  { value: 2, label: "2 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 20, label: "20 km" },
  { value: null, label: "Sin límite" },
];

// ─── Filtros activos ───────────────────────────────────────────────────────────

export interface Filtros {
  combustible: TipoCombustible;
  radio: RadioBusqueda;
}

// ─── Vehículo del usuario ──────────────────────────────────────────────────────

export interface Vehiculo {
  id: string;
  nombre: string;
  combustible: TipoCombustible;
  consumo: number;   // litros / 100 km
  deposito: number;  // capacidad en litros
}

// ─── Cálculo de ahorro por gasolinera ─────────────────────────────────────────

export interface AhorroGasolinera {
  precioLitro: number;
  costeDeposito: number;
  ahorroVsMaximo: number;   // € vs gasolinera más cara del radio
  ahorroVsMedia: number;    // € vs media del radio
}

// ─── Coordenadas geográficas ───────────────────────────────────────────────────

export interface Coordenadas {
  lat: number;
  lng: number;
}
