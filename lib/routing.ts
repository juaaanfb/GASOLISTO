import type { Coordenadas, Gasolinera, Vehiculo, TipoCombustible } from "@/types";
import type { PlanViaje, ParadaRepostaje } from "@/types/trip";
import { calcularDistancia, calcularEstadisticas, obtenerPrecio } from "@/lib/calculos";
import { geocodificarDireccion } from "@/lib/geocoding";
import { detectarMarca, type Marca } from "@/lib/marcas";

export { geocodificarDireccion };

// ─── Constantes del planificador ───────────────────────────────────────────
//
// Todas estas cifras son heurísticas conservadoras, documentadas aquí y
// explicadas al usuario en la interfaz; no son resultado de una
// optimización completa (ver docs/entrega-autonomia-iphone-2026-10-29.md).

// Colchón de seguridad: solo se cuenta como "alcanzable" hasta el 85% de la
// autonomía disponible en cada tramo. Es una estimación, no una garantía de
// llegada (consumo real, viento, climatización, etc. varían el resultado).
const MARGEN_RESERVA = 0.85;

// Radio de búsqueda en línea recta alrededor de un punto de la ruta para
// preseleccionar candidatas antes de verificar por carretera (igual que el
// resto de la app).
const RADIO_BUSQUEDA_KM = 10;

// Repostaje parcial conservador al necesitar una parada: 75% del depósito,
// no un "depósito lleno" automático. Explícito y documentado, no oculto.
const FRACCION_REPOSTAJE = 0.75;

// Por tramo que necesita parada, como mucho se verifican por carretera (vía
// OSRM) las N candidatas con mejor coste neto estimado antes de aceptar la
// primera que resulte alcanzable, para no multiplicar peticiones al
// proveedor por cada gasolinera cercana.
const MAX_CANDIDATOS_VERIFICAR_POR_TRAMO = 3;

// Presupuesto total de peticiones de verificación por carretera para todo
// el plan (además de la petición de la ruta principal). Si se agota sin
// completar el plan, se informa del límite en vez de seguir pidiendo rutas
// indefinidamente.
const MAX_VERIFICACIONES_TOTALES = 12;

// Salvaguarda anti-bucle: número máximo de paradas que se calculan en un
// mismo plan antes de detenerse y avisar, aunque la ruta sea muy larga.
const MAX_PARADAS = 8;

// Cualquier petición a OSRM (ruta principal o verificación de desvío) se
// cancela pasado este tiempo, para no dejar el cálculo colgado si el
// proveedor no responde.
const OSRM_TIMEOUT_MS = 8000;

// Por debajo de esto, origen y destino se consideran prácticamente el mismo
// punto: no tiene sentido calcular una ruta ni buscar paradas. Deliberadamente
// bajo (antes había un mínimo de 50 km) para no ocultar una necesidad real de
// repostaje en trayectos cortos con autonomía baja: ver sección 4 del
// encargo del 28/10.
const DISTANCIA_MINIMA_KM = 1;

async function obtenerRutaOSRM(
  origen: Coordenadas,
  destino: Coordenadas,
  signal?: AbortSignal
): Promise<{ distanciaKm: number; coordenadas: Coordenadas[] }> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origen.lng},${origen.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
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

// Petición de verificación de desvío con timeout propio: nunca debe dejar
// el plan colgado esperando a un proveedor lento, y cualquier fallo se
// trata como "candidata no verificada", no como error fatal del plan.
async function obtenerDistanciaCarreteraConTimeout(
  desde: Coordenadas,
  hasta: Coordenadas
): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);
  try {
    const { distanciaKm } = await obtenerRutaOSRM(desde, hasta, controller.signal);
    return distanciaKm;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

interface PuntoRuta {
  punto: Coordenadas;
  kmAcum: number;
}

// Todos los vértices de la ruta con su distancia acumulada desde el origen,
// a la resolución que ya trae la geometría de OSRM (sin peticiones extra).
function acumularKmRuta(coords: Coordenadas[]): PuntoRuta[] {
  const puntos: PuntoRuta[] = [{ punto: coords[0], kmAcum: 0 }];
  let distTotal = 0;
  for (let i = 1; i < coords.length; i++) {
    distTotal += calcularDistancia(coords[i - 1], coords[i]);
    puntos.push({ punto: coords[i], kmAcum: distTotal });
  }
  return puntos;
}

interface Candidata {
  gasolinera: Gasolinera;
  precio: number;
  kmRuta: number;
  puntoRuta: Coordenadas;
  distanciaLineaRectaKm: number;
}

// Candidatas dentro de una ventana [kmInicio, kmFin] de la ruta: para cada
// gasolinera compatible (combustible, marca si se pide, no usada ya) se
// queda con el punto de la ruta, dentro de la ventana, desde el que está
// más cerca en línea recta — esa cercanía es solo una preselección barata,
// nunca la prueba final de alcanzabilidad (eso lo hace la verificación por
// carretera más abajo).
function candidatasEnVentana(
  puntosRuta: PuntoRuta[],
  kmInicio: number,
  kmFin: number,
  gasolineras: Gasolinera[],
  combustible: TipoCombustible,
  marcaPreferida: Marca | null,
  usadas: Set<string>
): Candidata[] {
  const puntosVentana = puntosRuta.filter((p) => p.kmAcum >= kmInicio && p.kmAcum <= kmFin);
  if (puntosVentana.length === 0) return [];

  const porEstacion = new Map<string, Candidata>();
  for (const g of gasolineras) {
    if (usadas.has(g.id)) continue;
    const precio = obtenerPrecio(g, combustible);
    if (precio === undefined) continue;
    if (marcaPreferida && detectarMarca(g.nombre) !== marcaPreferida) continue;

    let mejor: Candidata | null = null;
    for (const p of puntosVentana) {
      const d = calcularDistancia(p.punto, { lat: g.latitud, lng: g.longitud });
      if (d > RADIO_BUSQUEDA_KM) continue;
      if (!mejor || d < mejor.distanciaLineaRectaKm) {
        mejor = { gasolinera: g, precio, kmRuta: p.kmAcum, puntoRuta: p.punto, distanciaLineaRectaKm: d };
      }
    }
    if (mejor) porEstacion.set(g.id, mejor);
  }
  return Array.from(porEstacion.values());
}

function litrosARepostarEstimado(vehiculo: Vehiculo): number {
  return Math.round(vehiculo.deposito * FRACCION_REPOSTAJE * 10) / 10;
}

// Ahorro neto estimado de repostar en una candidata: diferencia de precio
// frente al precio de referencia (media de la zona, misma base para todas
// las candidatas y para el resto del viaje) por los litros que se
// repostarían, menos el coste de combustible del desvío de ida y vuelta.
// Puede salir negativo: una parada necesaria para no quedarse sin
// combustible no siempre compensa económicamente.
function ahorroNetoEstimado(
  precioEstacion: number,
  litros: number,
  desvioKmIdaVuelta: number,
  vehiculo: Vehiculo,
  precioReferencia: number
): number {
  const costeDesvio = (desvioKmIdaVuelta / 100) * vehiculo.consumo * precioReferencia;
  const ahorroPrecio = (precioReferencia - precioEstacion) * litros;
  return Math.round((ahorroPrecio - costeDesvio) * 100) / 100;
}

export async function planificarViaje(
  origen: Coordenadas,
  destinoCoordenadas: Coordenadas,
  destinoTexto: string,
  todasGasolineras: Gasolinera[],
  vehiculo: Vehiculo,
  combustible: TipoCombustible,
  autonomiaRestanteKm: number,
  marcaPreferida: Marca | null = null
): Promise<PlanViaje> {
  // La autonomía restante es un estado puntual del usuario, nunca se asume
  // ni se completa automáticamente con el depósito lleno. 0 o inválida no
  // debe intentar buscar una parada lejana: se rechaza antes de pedir
  // siquiera la ruta principal.
  if (!Number.isFinite(autonomiaRestanteKm) || autonomiaRestanteKm <= 0) {
    throw new Error("AUTONOMIA_INVALIDA");
  }

  const controllerPrincipal = new AbortController();
  const timeoutPrincipal = setTimeout(() => controllerPrincipal.abort(), OSRM_TIMEOUT_MS);
  let distanciaKm: number;
  let coordenadas: Coordenadas[];
  try {
    ({ distanciaKm, coordenadas } = await obtenerRutaOSRM(origen, destinoCoordenadas, controllerPrincipal.signal));
  } finally {
    clearTimeout(timeoutPrincipal);
  }

  if (distanciaKm < DISTANCIA_MINIMA_KM) throw new Error("RUTA_CORTA");

  const puntosRuta = acumularKmRuta(coordenadas);
  const avisos: string[] = [];
  if (coordenadas.length < 3) {
    avisos.push(
      "La ruta devuelta por el proveedor tiene muy pocos puntos: la estimación de paradas puede ser menos precisa de lo normal."
    );
  }

  const { media: precioReferencia, maximo: precioMax } = calcularEstadisticas(todasGasolineras, combustible);

  const paradas: ParadaRepostaje[] = [];
  const usadas = new Set<string>();
  let kmRecorrido = 0;
  let autonomiaDisponible = autonomiaRestanteKm;
  let verificaciones = 0;
  let marcaBloqueaAlgunTramo = false;

  while (true) {
    const distanciaRestante = distanciaKm - kmRecorrido;
    const alcanceSeguro = autonomiaDisponible * MARGEN_RESERVA;

    if (distanciaRestante <= alcanceSeguro) break; // llega al destino sin más paradas

    if (paradas.length >= MAX_PARADAS) {
      avisos.push(
        `Se alcanzó el máximo de ${MAX_PARADAS} paradas calculables para esta ruta; revisa el resto del trayecto manualmente.`
      );
      break;
    }

    const kmFinVentana = Math.min(kmRecorrido + alcanceSeguro, distanciaKm);
    let candidatas = candidatasEnVentana(
      puntosRuta, kmRecorrido, kmFinVentana, todasGasolineras, combustible, marcaPreferida, usadas
    );

    if (candidatas.length === 0 && marcaPreferida) {
      const sinMarca = candidatasEnVentana(
        puntosRuta, kmRecorrido, kmFinVentana, todasGasolineras, combustible, null, usadas
      );
      if (sinMarca.length > 0) marcaBloqueaAlgunTramo = true;
    }

    if (candidatas.length === 0) {
      if (marcaBloqueaAlgunTramo) throw new Error("SIN_PARADA_ALCANZABLE_MARCA");
      throw new Error("SIN_PARADA_ALCANZABLE");
    }

    const litros = litrosARepostarEstimado(vehiculo);
    const ordenadas = [...candidatas].sort(
      (a, b) =>
        ahorroNetoEstimado(b.precio, litros, 2 * b.distanciaLineaRectaKm, vehiculo, precioReferencia) -
        ahorroNetoEstimado(a.precio, litros, 2 * a.distanciaLineaRectaKm, vehiculo, precioReferencia)
    );

    let elegida: { candidata: Candidata; desvioUnaViaKm: number } | null = null;
    for (const candidata of ordenadas.slice(0, MAX_CANDIDATOS_VERIFICAR_POR_TRAMO)) {
      if (verificaciones >= MAX_VERIFICACIONES_TOTALES) break;
      verificaciones++;
      const desvioUnaViaKm = await obtenerDistanciaCarreteraConTimeout(
        candidata.puntoRuta,
        { lat: candidata.gasolinera.latitud, lng: candidata.gasolinera.longitud }
      );
      if (desvioUnaViaKm === null) continue; // fallo/timeout verificando: se descarta, se prueba la siguiente

      // Distancia real hasta la estación desde el inicio del tramo: lo ya
      // recorrido por la ruta hasta el punto de acceso más el desvío de
      // ida. Debe caber dentro del alcance seguro de este tramo.
      const distanciaHastaEstacion = (candidata.kmRuta - kmRecorrido) + desvioUnaViaKm;
      if (distanciaHastaEstacion <= alcanceSeguro) {
        elegida = { candidata, desvioUnaViaKm };
        break;
      }
    }

    if (!elegida) {
      if (verificaciones >= MAX_VERIFICACIONES_TOTALES) {
        avisos.push(
          "Se alcanzó el límite de comprobaciones de ruta a estaciones cercanas sin encontrar una alcanzable; puede haber opciones no verificadas."
        );
      }
      throw new Error("SIN_PARADA_ALCANZABLE");
    }

    const { candidata, desvioUnaViaKm } = elegida;
    const desvioIdaVuelta = Math.round(desvioUnaViaKm * 2 * 10) / 10;
    const coste = Math.round(candidata.precio * litros * 100) / 100;
    const ahorroNeto = ahorroNetoEstimado(candidata.precio, litros, desvioIdaVuelta, vehiculo, precioReferencia);
    const autonomiaTrasRepostar = Math.round((litros / vehiculo.consumo) * 100);

    paradas.push({
      gasolinera: candidata.gasolinera,
      kmDesdeOrigen: Math.round(candidata.kmRuta),
      litrosARepostar: litros,
      costeRepostaje: coste,
      motivoPausa: "autonomia",
      desvioKm: desvioIdaVuelta,
      ahorroNetoEstimado: ahorroNeto,
      autonomiaTrasRepostarKm: autonomiaTrasRepostar,
    });
    usadas.add(candidata.gasolinera.id);
    kmRecorrido = candidata.kmRuta;
    // La autonomía disponible para el siguiente tramo sale de lo repostado
    // aquí, no del depósito lleno — y ya descuenta el propio regreso a la
    // ruta desde la estación, que también consume ese combustible.
    autonomiaDisponible = Math.max(0, autonomiaTrasRepostar - desvioUnaViaKm);
  }

  // Coste y ahorro del viaje completo (no solo de las paradas): litros que
  // consume el vehículo en toda la ruta al precio de referencia. Si el
  // depósito cubre el trayecto sin parar, el coste no puede mostrarse como 0€.
  const litrosTotalesViaje = (distanciaKm / 100) * vehiculo.consumo;
  const costeEstimado = Math.round(litrosTotalesViaje * precioReferencia * 100) / 100;
  const ahorroEstimado = Math.max(
    0,
    Math.round((litrosTotalesViaje * (precioMax - precioReferencia)) * 100) / 100
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
    autonomiaRestanteKm,
    margenReserva: MARGEN_RESERVA,
    avisos,
  };
}
