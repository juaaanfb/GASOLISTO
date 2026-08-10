import type {
  Gasolinera,
  Vehiculo,
  AhorroGasolinera,
  TipoCombustible,
  Coordenadas,
} from "@/types";

// ─── Distancia Haversine entre dos puntos GPS ──────────────────────────────────

export function calcularDistancia(desde: Coordenadas, hasta: Coordenadas): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(hasta.lat - desde.lat);
  const dLng = toRad(hasta.lng - desde.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(desde.lat)) * Math.cos(toRad(hasta.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(grados: number): number {
  return (grados * Math.PI) / 180;
}

// ─── Filtrado por radio ────────────────────────────────────────────────────────

export function filtrarPorRadio(
  gasolineras: Gasolinera[],
  centro: Coordenadas,
  radioKm: number | null
): Gasolinera[] {
  const conDistancia = gasolineras.map((g) => ({
    ...g,
    distancia: calcularDistancia(centro, { lat: g.latitud, lng: g.longitud }),
  }));

  if (radioKm === null) return conDistancia;
  return conDistancia.filter((g) => g.distancia! <= radioKm);
}

// ─── Precio de la gasolinera para el combustible seleccionado ─────────────────

export function obtenerPrecio(
  gasolinera: Gasolinera,
  combustible: TipoCombustible
): number | undefined {
  const mapa: Record<TipoCombustible, keyof typeof gasolinera.precios> = {
    gasolina95: "gasolina95",
    gasolina98: "gasolina98",
    diesel: "diesel",
    glp: "glp",
  };
  return gasolinera.precios[mapa[combustible]];
}

// ─── Estadísticas del radio: media y precio máximo ────────────────────────────

export function calcularEstadisticas(
  gasolineras: Gasolinera[],
  combustible: TipoCombustible
): { media: number; maximo: number; minimo: number } {
  const precios = gasolineras
    .map((g) => obtenerPrecio(g, combustible))
    .filter((p): p is number => p !== undefined && p > 0);

  if (precios.length === 0) return { media: 0, maximo: 0, minimo: 0 };

  return {
    media: precios.reduce((a, b) => a + b, 0) / precios.length,
    maximo: Math.max(...precios),
    minimo: Math.min(...precios),
  };
}

// ─── Cálculo del ahorro para una gasolinera concreta ─────────────────────────

export function calcularAhorro(
  gasolinera: Gasolinera,
  vehiculo: Vehiculo,
  stats: { media: number; maximo: number }
): AhorroGasolinera | null {
  const precioLitro = obtenerPrecio(gasolinera, vehiculo.combustible);
  if (!precioLitro) return null;

  const costeDeposito = precioLitro * vehiculo.deposito;
  const ahorroVsMaximo = (stats.maximo - precioLitro) * vehiculo.deposito;
  const ahorroVsMedia = (stats.media - precioLitro) * vehiculo.deposito;

  return {
    precioLitro,
    costeDeposito,
    ahorroVsMaximo: Math.max(0, ahorroVsMaximo),
    ahorroVsMedia,
  };
}

// ─── Clasificación de precio: barato / medio / caro ──────────────────────────

export type ClasificacionPrecio = "barato" | "medio" | "caro";

export function clasificarPrecio(
  precio: number,
  stats: { media: number; maximo: number; minimo: number }
): ClasificacionPrecio {
  const rango = stats.maximo - stats.minimo;
  if (rango === 0) return "medio";
  const percentil = (precio - stats.minimo) / rango;
  if (percentil <= 0.33) return "barato";
  if (percentil <= 0.66) return "medio";
  return "caro";
}

// ─── Formateo de precios ───────────────────────────────────────────────────────

export function formatPrecio(precio: number): string {
  return precio.toFixed(3) + " €/L";
}

export function formatEuros(cantidad: number): string {
  return cantidad.toFixed(2).replace(".", ",") + " €";
}

export function formatDistancia(km: number): string {
  if (km < 1) return Math.round(km * 1000) + " m";
  return km.toFixed(1) + " km";
}
