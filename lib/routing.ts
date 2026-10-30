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

// Objetivo de repostaje al necesitar una parada: se reposta hasta dejar el
// depósito al 75% de su capacidad (no un "depósito lleno" automático), y
// nunca más de lo que falta para completarlo al 100%. Explícito y
// documentado, no oculto; se resta siempre el combustible que ya quedaba
// al llegar (ver calcularBalanceCombustible).
const FRACCION_REPOSTAJE_OBJETIVO = 0.75;

// Por tramo que necesita parada, como mucho se verifican por carretera (vía
// OSRM) las N candidatas con mejor coste neto estimado en línea recta,
// comparando después sus costes netos reales entre sí — no se acepta la
// primera que resulte alcanzable — para no multiplicar peticiones al
// proveedor por cada gasolinera cercana.
const MAX_CANDIDATOS_VERIFICAR_POR_TRAMO = 3;

// Presupuesto total de peticiones de verificación por carretera para todo
// el plan (además de la petición de la ruta principal). Cada candidata
// verificada cuesta 1 petición (ida y vuelta/reincorporación en la misma
// llamada, ver obtenerIdaVueltaConTimeout). Si se agota sin completar el
// plan, se informa con un error distinguible en vez de seguir pidiendo
// rutas indefinidamente.
const MAX_VERIFICACIONES_TOTALES = 12;

// Salvaguarda anti-bucle: número máximo de paradas que se calculan en un
// mismo plan. Si se alcanza sin haber llegado al destino, el plan se
// considera incompleto y se devuelve un error distinguible, nunca un plan
// que aparente estar completo.
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

// Si la geometría de la ruta (suma de segmentos en línea recta entre sus
// vértices) difiere de la distancia total que declara OSRM en más de este
// porcentaje tras reescalarla, se avisa al usuario de que la estimación de
// paradas es menos fiable de lo normal (ver acumularKmRuta).
const DESVIACION_GEOMETRIA_AVISO = 0.05;

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

// Verifica el desvío real de ida Y de vuelta/reincorporación a la ruta en
// una sola petición con 3 puntos (punto de ruta → estación → mismo punto
// de ruta), en vez de asumir que ambos sentidos son simétricos. Si la
// petición falla, da timeout o la respuesta no trae los dos tramos, se
// trata como "candidata no verificada" por completo — ni la ida ni la
// vuelta se usan como dato confirmado para la autonomía del siguiente
// tramo — y se descarta, nunca como error fatal del plan completo.
async function obtenerIdaVueltaConTimeout(
  puntoRuta: Coordenadas,
  estacion: Coordenadas
): Promise<{ idaKm: number; vueltaKm: number } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${puntoRuta.lng},${puntoRuta.lat};${estacion.lng},${estacion.lat};${puntoRuta.lng},${puntoRuta.lat}?overview=false`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const datos = await res.json();
    if (datos.code !== "Ok" || !datos.routes?.length) return null;
    const legs = datos.routes[0].legs;
    if (!Array.isArray(legs) || legs.length < 2) return null;
    return { idaKm: legs[0].distance / 1000, vueltaKm: legs[1].distance / 1000 };
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

// Todos los vértices de la ruta con su distancia acumulada desde el
// origen. La suma de segmentos en línea recta entre vértices puede no
// coincidir exactamente con distanciaTotalOSRM (la distancia real por
// carretera que ya devolvió el proveedor para el mismo trayecto) — se
// reescala todo el acumulado para que coincidan, así nunca se mezclan dos
// escalas ligeramente distintas de una forma que pudiera subestimar el
// combustible necesario en algún tramo.
function acumularKmRuta(
  coords: Coordenadas[],
  distanciaTotalOSRM: number
): { puntos: PuntoRuta[]; factorReescalado: number } {
  const puntos: PuntoRuta[] = [{ punto: coords[0], kmAcum: 0 }];
  let distTotal = 0;
  for (let i = 1; i < coords.length; i++) {
    distTotal += calcularDistancia(coords[i - 1], coords[i]);
    puntos.push({ punto: coords[i], kmAcum: distTotal });
  }
  const factorReescalado = distTotal > 0 ? distanciaTotalOSRM / distTotal : 1;
  return {
    puntos: puntos.map((p) => ({ ...p, kmAcum: p.kmAcum * factorReescalado })),
    factorReescalado,
  };
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

// Estimación previa a la verificación, solo para decidir en qué orden
// probar las candidatas por carretera (usa la autonomía máxima del
// depósito como aproximación de litros, no el balance real de combustible
// — ese solo se conoce tras verificar la distancia real, ver
// calcularBalanceCombustible más abajo).
function litrosParaOrdenInicial(vehiculo: Vehiculo): number {
  return vehiculo.deposito * FRACCION_REPOSTAJE_OBJETIVO;
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

interface BalanceCombustible {
  litrosRestantesAlLlegar: number;
  litrosARepostar: number;
  litrosTrasRepostar: number;
  autonomiaTrasRepostarKm: number; // en la estación, antes de descontar la reincorporación a la ruta
}

// Combustible que queda al llegar a la estación (nunca negativo), litros
// que se repostan limitados a la capacidad libre real del depósito (no se
// puede repostar más de lo que cabe), y combustible resultante como la
// suma de lo que quedaba más lo repostado — nunca "reiniciado" a una
// cantidad fija ignorando lo que ya había.
function calcularBalanceCombustible(
  autonomiaDisponibleKm: number,
  distanciaHastaEstacionKm: number,
  vehiculo: Vehiculo
): BalanceCombustible {
  const autonomiaRestanteAlLlegarKm = Math.max(0, autonomiaDisponibleKm - distanciaHastaEstacionKm);
  const litrosRestantesAlLlegar = (autonomiaRestanteAlLlegarKm / 100) * vehiculo.consumo;
  const capacidadLibre = Math.max(0, vehiculo.deposito - litrosRestantesAlLlegar);
  const nivelObjetivo = FRACCION_REPOSTAJE_OBJETIVO * vehiculo.deposito;
  const litrosARepostar = Math.max(
    0,
    Math.round(Math.min(capacidadLibre, Math.max(0, nivelObjetivo - litrosRestantesAlLlegar)) * 10) / 10
  );
  const litrosTrasRepostar = Math.round((litrosRestantesAlLlegar + litrosARepostar) * 10) / 10;
  return {
    litrosRestantesAlLlegar: Math.round(litrosRestantesAlLlegar * 10) / 10,
    litrosARepostar,
    litrosTrasRepostar,
    autonomiaTrasRepostarKm: Math.round((litrosTrasRepostar / vehiculo.consumo) * 100),
  };
}

interface CandidataVerificada {
  candidata: Candidata;
  idaKm: number;
  vueltaKm: number;
  distanciaHastaEstacion: number;
  balance: BalanceCombustible;
  ahorroNeto: number;
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

  const avisos: string[] = [];
  if (coordenadas.length < 3) {
    avisos.push(
      "La ruta devuelta por el proveedor tiene muy pocos puntos: la estimación de paradas puede ser menos precisa de lo normal."
    );
  }
  const { puntos: puntosRuta, factorReescalado } = acumularKmRuta(coordenadas, distanciaKm);
  if (Math.abs(factorReescalado - 1) > DESVIACION_GEOMETRIA_AVISO) {
    avisos.push(
      `La geometría de la ruta no coincidía exactamente con la distancia total del proveedor (ajustada un ${Math.round(Math.abs(factorReescalado - 1) * 100)}%) para no subestimar el combustible necesario.`
    );
  }

  const { media: precioReferencia } = calcularEstadisticas(todasGasolineras, combustible);

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

    // No se devuelve nunca un plan de aspecto normal si se alcanza el
    // límite de paradas sin haber llegado: el plan se considera
    // incompleto y se señala con un error distinguible.
    if (paradas.length >= MAX_PARADAS) {
      throw new Error("LIMITE_PARADAS_SIN_LLEGAR");
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

    const litrosOrden = litrosParaOrdenInicial(vehiculo);
    const ordenadas = [...candidatas].sort(
      (a, b) =>
        ahorroNetoEstimado(b.precio, litrosOrden, 2 * b.distanciaLineaRectaKm, vehiculo, precioReferencia) -
        ahorroNetoEstimado(a.precio, litrosOrden, 2 * a.distanciaLineaRectaKm, vehiculo, precioReferencia)
    );

    // Se verifica un conjunto acotado de candidatas por carretera (ida Y
    // vuelta/reincorporación reales, nunca asumidas simétricas) y se
    // compara después el coste neto real entre TODAS las que resulten
    // alcanzables — no se acepta la primera que lo sea.
    const verificadas: CandidataVerificada[] = [];
    let huboFalloProveedor = false;
    let seAgotoPresupuesto = false;
    for (const candidata of ordenadas.slice(0, MAX_CANDIDATOS_VERIFICAR_POR_TRAMO)) {
      if (verificaciones >= MAX_VERIFICACIONES_TOTALES) { seAgotoPresupuesto = true; break; }
      verificaciones++;
      const resultado = await obtenerIdaVueltaConTimeout(
        candidata.puntoRuta,
        { lat: candidata.gasolinera.latitud, lng: candidata.gasolinera.longitud }
      );
      if (resultado === null) { huboFalloProveedor = true; continue; }

      const distanciaHastaEstacion = (candidata.kmRuta - kmRecorrido) + resultado.idaKm;
      if (distanciaHastaEstacion > alcanceSeguro) continue; // verificada, pero fuera de alcance real

      const balance = calcularBalanceCombustible(autonomiaDisponible, distanciaHastaEstacion, vehiculo);
      const ahorroNeto = ahorroNetoEstimado(
        candidata.precio, balance.litrosARepostar, resultado.idaKm + resultado.vueltaKm, vehiculo, precioReferencia
      );
      verificadas.push({ candidata, idaKm: resultado.idaKm, vueltaKm: resultado.vueltaKm, distanciaHastaEstacion, balance, ahorroNeto });
    }

    if (verificadas.length === 0) {
      if (seAgotoPresupuesto) throw new Error("LIMITE_PETICIONES_AGOTADO");
      if (huboFalloProveedor) throw new Error("FALLO_VERIFICACION_PROVEEDOR");
      throw new Error("SIN_PARADA_VERIFICADA");
    }

    // Mejor opción ENTRE LAS COMPROBADAS (nunca "óptima" global): mayor
    // ahorro neto con datos reales de ida y vuelta, no en línea recta.
    const elegida = verificadas.reduce((mejor, actual) => (actual.ahorroNeto > mejor.ahorroNeto ? actual : mejor));

    paradas.push({
      gasolinera: elegida.candidata.gasolinera,
      kmDesdeOrigen: Math.round(elegida.candidata.kmRuta),
      litrosARepostar: elegida.balance.litrosARepostar,
      costeRepostaje: Math.round(elegida.candidata.precio * elegida.balance.litrosARepostar * 100) / 100,
      motivoPausa: "autonomia",
      desvioKm: Math.round((elegida.idaKm + elegida.vueltaKm) * 10) / 10,
      ahorroNetoEstimado: elegida.ahorroNeto,
      autonomiaTrasRepostarKm: elegida.balance.autonomiaTrasRepostarKm,
    });
    usadas.add(elegida.candidata.gasolinera.id);
    kmRecorrido = elegida.candidata.kmRuta;
    // La autonomía disponible para el siguiente tramo sale del balance real
    // (combustible que quedaba + lo repostado, nunca reiniciado) menos la
    // reincorporación real verificada a la ruta, nunca estimada como igual
    // a la ida.
    autonomiaDisponible = Math.max(0, elegida.balance.autonomiaTrasRepostarKm - elegida.vueltaKm);
  }

  // Resumen económico: tres cifras distintas, sin contar nada dos veces.
  // 1) Coste de combustible del trayecto COMPLETO (incluidos los desvíos
  //    de las paradas) al precio de referencia actual — descriptivo del
  //    viaje entero, no se le resta ningún ahorro.
  const desvioTotalKm = paradas.reduce((acc, p) => acc + p.desvioKm, 0);
  const litrosTotalesViaje = ((distanciaKm + desvioTotalKm) / 100) * vehiculo.consumo;
  const costeCombustibleEstimado = Math.round(litrosTotalesViaje * precioReferencia * 100) / 100;
  // 2) Importe real de repostar en las paradas recomendadas, a su propio
  //    precio — una cifra de pago concreta, no el coste del viaje entero.
  const importeRepostajes = Math.round(paradas.reduce((acc, p) => acc + p.costeRepostaje, 0) * 100) / 100;
  // 3) Ahorro estimado de esas paradas frente al precio de referencia, ya
  //    neto del combustible de cada desvío (suma de lo que ya calcula cada
  //    parada; no se resta el desvío otra vez aquí).
  const ahorroEstimadoParadas = Math.round(paradas.reduce((acc, p) => acc + p.ahorroNetoEstimado, 0) * 100) / 100;

  return {
    origen,
    destino: destinoTexto,
    destinoCoordenadas,
    distanciaKm: Math.round(distanciaKm),
    rutaCoordenadas: coordenadas,
    paradas,
    costeCombustibleEstimado,
    importeRepostajes,
    ahorroEstimadoParadas,
    autonomiaRestanteKm,
    margenReserva: MARGEN_RESERVA,
    avisos,
  };
}
