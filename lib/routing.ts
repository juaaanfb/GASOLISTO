import type { Coordenadas, Gasolinera, Vehiculo, TipoCombustible } from "@/types";
import type { PlanViaje, ParadaRepostaje } from "@/types/trip";
import { calcularDistancia, obtenerPrecio } from "@/lib/calculos";

export async function geocodificarDireccion(texto: string): Promise<Coordenadas> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(texto)}&format=json&limit=1&countrycodes=es`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "es", "User-Agent": "Gasolisto/1.0" },
  });
  if (!res.ok) throw new Error("NOMINATIM_ERROR");
  const datos = await res.json();
  if (!datos.length) throw new Error("NO_ENCONTRADO");
  return { lat: parseFloat(datos[0].lat), lng: parseFloat(datos[0].lon) };
}

async function obtenerRutaOSRM(
  origen: Coordenadas,
  destino: Coordenadas
): Promise<{ distanciaKm: number; coordenadas: Coordenadas[] }> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origen.lng},${origen.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("OSRM_ERROR");
  const datos = await res.json();
  if (datos.code !== "Ok" || !datos.routes?.length) throw new Error("RUTA_NO_ENCONTRADA");
  const ruta = datos.routes[0];
  return {
    distanciaKm: ruta.distance / 1000,
    coordenadas: ruta.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => ({ lat, lng })
    ),
  };
}

function puntosPorIntervalo(
  coords: Coordenadas[],
  intervaloKm: number
): { punto: Coordenadas; kmAcum: number }[] {
  const resultados: { punto: Coordenadas; kmAcum: number }[] = [];
  let distSegmento = 0;
  let distTotal = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = calcularDistancia(coords[i - 1], coords[i]);
    distSegmento += d;
    distTotal += d;
    if (distSegmento >= intervaloKm) {
      resultados.push({ punto: coords[i], kmAcum: distTotal });
      distSegmento = 0;
    }
  }
  return resultados;
}

function mejorGasolineraEnPunto(
  punto: Coordenadas,
  gasolineras: Gasolinera[],
  combustible: TipoCombustible,
  radioKm = 10
): Gasolinera | null {
  return (
    gasolineras
      .filter((g) => obtenerPrecio(g, combustible) !== undefined)
      .map((g) => ({
        g,
        d: calcularDistancia(punto, { lat: g.latitud, lng: g.longitud }),
      }))
      .filter(({ d }) => d <= radioKm)
      .sort((a, b) => obtenerPrecio(a.g, combustible)! - obtenerPrecio(b.g, combustible)!)
      [0]?.g ?? null
  );
}

export async function planificarViaje(
  origen: Coordenadas,
  destinoTexto: string,
  todasGasolineras: Gasolinera[],
  vehiculo: Vehiculo,
  combustible: TipoCombustible
): Promise<PlanViaje> {
  const destinoCoordenadas = await geocodificarDireccion(destinoTexto);
  const { distanciaKm, coordenadas } = await obtenerRutaOSRM(origen, destinoCoordenadas);

  if (distanciaKm < 50) throw new Error("RUTA_CORTA");

  const autonomiaKm = (vehiculo.deposito / vehiculo.consumo) * 100;
  const intervalo = autonomiaKm * 0.85;

  const puntos = puntosPorIntervalo(coordenadas, intervalo);
  const paradas: ParadaRepostaje[] = [];

  for (const { punto, kmAcum } of puntos) {
    if (kmAcum >= distanciaKm - 30) break;

    const gasolinera = mejorGasolineraEnPunto(punto, todasGasolineras, combustible);
    if (!gasolinera) continue;

    const precio = obtenerPrecio(gasolinera, combustible)!;
    const litrosARepostar = Math.round(vehiculo.deposito * 0.75 * 10) / 10;
    const costeRepostaje = Math.round(precio * litrosARepostar * 100) / 100;

    paradas.push({
      gasolinera,
      kmDesdeOrigen: Math.round(kmAcum),
      litrosARepostar,
      costeRepostaje,
      motivoPausa: "autonomia",
    });
  }

  if (paradas.length === 0 && distanciaKm >= autonomiaKm) {
    throw new Error("SIN_GASOLINERAS");
  }

  const costeEstimado =
    Math.round(paradas.reduce((s, p) => s + p.costeRepostaje, 0) * 100) / 100;

  const preciosDisponibles = todasGasolineras
    .map((g) => obtenerPrecio(g, combustible))
    .filter((p): p is number => p !== undefined);
  const precioMax = preciosDisponibles.length ? Math.max(...preciosDisponibles) : 0;
  const totalLitros = paradas.reduce((s, p) => s + p.litrosARepostar, 0);
  const ahorroEstimado = Math.max(
    0,
    Math.round((precioMax * totalLitros - costeEstimado) * 100) / 100
  );

  return {
    origen,
    destino: destinoTexto,
    destinoCoordenadas,
    distanciaKm: Math.round(distanciaKm),
    rutaCoordenadas: coordenadas,
    paradas,
    ahorroEstimado,
    costeEstimado,
  };
}
