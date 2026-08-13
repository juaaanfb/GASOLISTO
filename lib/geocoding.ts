import type { Coordenadas } from "@/types";

export interface LugarSugerido {
  label: string;
  lat: number;
  lng: number;
}

const PHOTON_URL = "https://photon.komoot.io/api/";

interface PhotonProperties {
  name?: string;
  housenumber?: string;
  street?: string;
  city?: string;
  county?: string;
  state?: string;
  countrycode?: string;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: PhotonProperties;
}

function etiquetaLugar(p: PhotonProperties): string {
  const linea1 = p.name || (p.street ? `${p.street}${p.housenumber ? ` ${p.housenumber}` : ""}` : undefined);
  const partes = [linea1, p.city || p.county, p.state].filter(
    (v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i
  );
  return partes.slice(0, 3).join(", ");
}

// Busca direcciones, calles y sitios de interés en España usando Photon
// (motor de geocodificación de OpenStreetMap pensado para autocompletado,
// gratis y sin API key). Sustituye a Nominatim, que devolvía muchos menos
// resultados de calles y puntos de interés en la búsqueda de destino.
export async function buscarLugares(
  texto: string,
  opciones: { limit?: number; bias?: Coordenadas } = {}
): Promise<LugarSugerido[]> {
  const { limit = 5, bias } = opciones;
  if (texto.trim().length < 2) return [];

  // Sin "lang": la instancia pública de Photon solo admite
  // default/de/en/fr — "es" devuelve 400. El modo "default" ya da los
  // nombres en el idioma local de OSM, que para España es español.
  const params = new URLSearchParams({
    q: texto,
    limit: String(limit),
  });
  if (bias) {
    params.set("lat", String(bias.lat));
    params.set("lon", String(bias.lng));
  }

  const res = await fetch(`${PHOTON_URL}?${params.toString()}`);
  if (!res.ok) throw new Error("GEOCODING_ERROR");
  const datos = await res.json();

  return ((datos.features ?? []) as PhotonFeature[])
    .filter((f) => !f.properties.countrycode || f.properties.countrycode === "ES")
    .map((f) => ({
      label: etiquetaLugar(f.properties),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    }))
    .filter((l) => l.label.length > 0);
}

export async function geocodificarDireccion(texto: string): Promise<Coordenadas> {
  const [primero] = await buscarLugares(texto, { limit: 1 });
  if (!primero) throw new Error("NO_ENCONTRADO");
  return { lat: primero.lat, lng: primero.lng };
}
