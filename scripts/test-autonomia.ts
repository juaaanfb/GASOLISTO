// Pruebas deterministas de la lógica de autonomía restante (lib/routing.ts).
// No usan red real: global.fetch se sustituye por un mock que responde a
// partir de las coordenadas de la URL, así que no generan tráfico al
// proveedor real de rutas (OSRM) ni a ningún otro servicio.
//
// Requiere `npx tsx` (no añadido a package.json a propósito, ver informe de
// entrega): se ejecuta con
//   npx tsx scripts/test-autonomia.ts
// desde la raíz del proyecto, para que tsx resuelva los alias "@/" del
// tsconfig.json real del proyecto.
import assert from "node:assert/strict";
import { planificarViaje } from "../lib/routing";
import { calcularDistancia } from "../lib/calculos";
import type { Coordenadas, Gasolinera, Vehiculo, TipoCombustible } from "../types";

// ─── Utilidades de datos de prueba ─────────────────────────────────────────

let contadorEstaciones = 0;
function estacion(overrides: Partial<Gasolinera> & { lat: number; lng: number; precio: number }): Gasolinera {
  contadorEstaciones++;
  return {
    id: overrides.id ?? `est-${contadorEstaciones}`,
    nombre: overrides.nombre ?? `Estación ${contadorEstaciones}`,
    direccion: "Calle de prueba",
    localidad: "Pueblo de prueba",
    provincia: "Provincia de prueba",
    codigoPostal: "00000",
    latitud: overrides.lat,
    longitud: overrides.lng,
    horario: "24H",
    precios: { gasolina95: overrides.precio },
    ultimaActualizacion: "29/10/2026",
  };
}

const VEHICULO: Vehiculo = { id: "v1", nombre: "Coche de prueba", combustible: "gasolina95", consumo: 6, deposito: 20 };
const COMBUSTIBLE: TipoCombustible = "gasolina95";

// Origen/destino sobre el mismo paralelo (misma latitud): así la distancia
// Haversine entre dos puntos cualesquiera de esta "ruta" es fácil de
// razonar y perfectamente determinista.
const LAT = 40.0;
const LNG_ORIGEN = -3.9;
function puntoAKm(km: number): Coordenadas {
  // Grado de longitud ≈ 111.32 * cos(lat) km a esta latitud; se despeja a
  // partir de la propia función de distancia del proyecto para no
  // depender de una aproximación manual.
  const unGrado = calcularDistancia({ lat: LAT, lng: LNG_ORIGEN }, { lat: LAT, lng: LNG_ORIGEN + 1 });
  return { lat: LAT, lng: LNG_ORIGEN + km / unGrado };
}

// ─── Mock de fetch (OSRM) ──────────────────────────────────────────────────
//
// Cada test instala su propio mock. El genérico de abajo sirve de base:
// interpreta la URL de OSRM, calcula la distancia Haversine entre los dos
// puntos pedidos (igual a la "carretera" en esta red de pruebas, salvo que
// el test indique una inflación específica para un par de coordenadas) y
// devuelve una geometría de línea recta entre ambos.
interface LlamadaFetch { url: string; signal?: AbortSignal | null }

function crearMockFetch(opciones: {
  inflaciones?: { desde: Coordenadas; hasta: Coordenadas; factor: number }[];
  fallarSiempre?: boolean;
  fallarSoloEn?: (url: string, numLlamada: number) => boolean;
  respuestaVacia?: boolean;
}) {
  const llamadas: LlamadaFetch[] = [];
  const fn = async (url: string, init?: { signal?: AbortSignal | null }) => {
    llamadas.push({ url, signal: init?.signal });
    if (opciones.fallarSiempre || opciones.fallarSoloEn?.(url, llamadas.length)) {
      throw new Error("NETWORK_FAIL_SIMULADO");
    }
    const m = url.match(/driving\/([-\d.]+),([-\d.]+);([-\d.]+),([-\d.]+)/);
    if (!m) throw new Error("URL_NO_RECONOCIDA_EN_MOCK: " + url);
    const [, lng1, lat1, lng2, lat2] = m.map(Number) as unknown as number[];
    const desde: Coordenadas = { lat: lat1, lng: lng1 };
    const hasta: Coordenadas = { lat: lat2, lng: lng2 };

    if (opciones.respuestaVacia) {
      return { ok: true, json: async () => ({}) } as Response;
    }

    let distanciaKm = calcularDistancia(desde, hasta);
    const inflacion = opciones.inflaciones?.find(
      (i) => Math.abs(i.desde.lat - desde.lat) < 1e-6 && Math.abs(i.desde.lng - desde.lng) < 1e-6 &&
             Math.abs(i.hasta.lat - hasta.lat) < 1e-6 && Math.abs(i.hasta.lng - hasta.lng) < 1e-6
    );
    if (inflacion) distanciaKm = inflacion.factor; // factor = distancia final deseada (km), no multiplicador

    // La geometría real de OSRM trae muchos vértices intermedios, no solo
    // origen/destino: aquí se interpola 1 punto por km (sobre la distancia
    // en línea recta, suficiente para que la ventana de búsqueda del
    // planificador encuentre puntos de ruta cercanos a cualquier estación
    // de prueba, igual que ocurre con la geometría real de OSRM).
    const distanciaLineaRecta = calcularDistancia(desde, hasta);
    const pasos = Math.max(1, Math.round(distanciaLineaRecta));
    const coordinates: [number, number][] = [];
    for (let i = 0; i <= pasos; i++) {
      const t = i / pasos;
      coordinates.push([desde.lng + (hasta.lng - desde.lng) * t, desde.lat + (hasta.lat - desde.lat) * t]);
    }

    return {
      ok: true,
      json: async () => ({
        code: "Ok",
        routes: [{
          distance: distanciaKm * 1000,
          geometry: { coordinates },
        }],
      }),
    } as Response;
  };
  return { fn, llamadas };
}

// ─── Arnés mínimo de pruebas ────────────────────────────────────────────────

let pasados = 0;
let fallidos = 0;
async function test(nombre: string, fn: () => Promise<void>) {
  try {
    await fn();
    pasados++;
    console.log(`PASS ${nombre}`);
  } catch (e) {
    fallidos++;
    console.error(`FAIL ${nombre}`);
    console.error(e);
  }
}

async function esperaError(promesa: Promise<unknown>, codigoEsperado: string) {
  try {
    await promesa;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    assert.equal(msg, codigoEsperado, `se esperaba el error "${codigoEsperado}", se obtuvo "${msg}"`);
    return;
  }
  assert.fail(`se esperaba que lanzara "${codigoEsperado}" y no lanzó nada`);
}

// ─── Casos ──────────────────────────────────────────────────────────────────

async function main() {
  await test("1. Viaje cubierto sin repostar", async () => {
    const { fn, llamadas } = crearMockFetch({});
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    const destino = puntoAKm(100);
    const plan = await planificarViaje(puntoAKm(0), destino, "Destino", [], VEHICULO, COMBUSTIBLE, 200, null);
    assert.equal(plan.paradas.length, 0);
    assert.equal(plan.autonomiaRestanteKm, 200);
    assert.equal(llamadas.length, 1, "solo debe pedirse la ruta principal, sin verificar ninguna parada");
  });

  await test("2. Autonomía baja: primera parada temprana", async () => {
    const { fn } = crearMockFetch({});
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    const gasolineras = [estacion({ lat: puntoAKm(30).lat, lng: puntoAKm(30).lng, precio: 1.5 })];
    const plan = await planificarViaje(puntoAKm(0), puntoAKm(150), "Destino", gasolineras, VEHICULO, COMBUSTIBLE, 60, null);
    assert.equal(plan.paradas.length, 1);
    assert.equal(plan.paradas[0].motivoPausa, "autonomia");
    assert(plan.paradas[0].kmDesdeOrigen <= 51, "la parada debe caer dentro del alcance seguro (60*0.85=51)");
  });

  await test("3. Autonomía cero: rechazo inmediato sin red", async () => {
    const { fn, llamadas } = crearMockFetch({});
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    await esperaError(
      planificarViaje(puntoAKm(0), puntoAKm(100), "Destino", [], VEHICULO, COMBUSTIBLE, 0, null),
      "AUTONOMIA_INVALIDA"
    );
    assert.equal(llamadas.length, 0, "no debe pedirse ninguna ruta con autonomía 0");

    await esperaError(
      planificarViaje(puntoAKm(0), puntoAKm(100), "Destino", [], VEHICULO, COMBUSTIBLE, -5, null),
      "AUTONOMIA_INVALIDA"
    );
    await esperaError(
      planificarViaje(puntoAKm(0), puntoAKm(100), "Destino", [], VEHICULO, COMBUSTIBLE, NaN, null),
      "AUTONOMIA_INVALIDA"
    );
    assert.equal(llamadas.length, 0, "ninguna de las tres variantes inválidas debe generar red");
  });

  await test("4. Estación barata fuera de alcance: se descarta por carretera, no por línea recta", async () => {
    const puntoA = puntoAKm(45); // dentro de la ventana [0,51]
    const puntoB = puntoAKm(40);
    const estA = estacion({ lat: puntoA.lat + 0.02, lng: puntoA.lng, precio: 1.2 }); // la más barata
    const estB = estacion({ lat: puntoB.lat, lng: puntoB.lng, precio: 1.5 }); // la alcanzable
    const { fn, llamadas } = crearMockFetch({
      // A está cerca en línea recta pero el mock dice que por carretera son
      // 30 km de desvío de ida: inalcanzable dentro del margen (51 km),
      // puesto que 45 (ya recorridos) + 30 > 51.
      inflaciones: [{ desde: puntoA, hasta: { lat: estA.latitud, lng: estA.longitud }, factor: 30 }],
    });
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    const plan = await planificarViaje(puntoAKm(0), puntoAKm(150), "Destino", [estA, estB], VEHICULO, COMBUSTIBLE, 60, null);
    assert.equal(plan.paradas.length, 1);
    assert.equal(plan.paradas[0].gasolinera.id, estB.id, "debe elegir la alcanzable, no la barata inalcanzable");
    assert(llamadas.length <= 1 + 2, "no debe verificarse de más: ruta principal + como mucho las candidatas de esta ventana");
  });

  await test("5. Estación barata cuyo desvío elimina el ahorro", async () => {
    const puntoD = puntoAKm(50);
    const estD = estacion({ lat: puntoD.lat, lng: puntoD.lng, precio: 1.48 }); // en ruta, sin desvío
    const puntoCBase = puntoAKm(50);
    const estC = estacion({ lat: puntoCBase.lat + 0.1, lng: puntoCBase.lng, precio: 1.42 }); // más barata, con desvío
    // Estaciones lejos de la ruta (otra latitud, fuera de cualquier
    // ventana de búsqueda) solo para fijar un precio de referencia de
    // mercado independiente de C y D; sin ellas la "media" sería la media
    // de solo dos estaciones y el test no demostraría nada realista.
    const relleno = [1.6, 1.6, 1.6, 1.6].map((precio) => estacion({ lat: 10, lng: 10, precio }));
    const { fn } = crearMockFetch({
      inflaciones: [
        { desde: puntoD, hasta: { lat: estD.latitud, lng: estD.longitud }, factor: 0 },
        { desde: puntoCBase, hasta: { lat: estC.latitud, lng: estC.longitud }, factor: 25 }, // 25 km ida
      ],
    });
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    const plan = await planificarViaje(puntoAKm(0), puntoAKm(200), "Destino", [estC, estD, ...relleno], VEHICULO, COMBUSTIBLE, 100, null);
    assert.equal(plan.paradas.length, 1);
    assert.equal(plan.paradas[0].gasolinera.id, estD.id, "debe preferir la más cara sin desvío frente a la barata con desvío caro");
    assert(plan.paradas[0].ahorroNetoEstimado > 0, "la elegida debe tener ahorro neto positivo frente al precio de referencia");
  });

  await test("6. Ausencia de estación viable", async () => {
    const { fn } = crearMockFetch({});
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    await esperaError(
      planificarViaje(puntoAKm(0), puntoAKm(200), "Destino", [], VEHICULO, COMBUSTIBLE, 60, null),
      "SIN_PARADA_ALCANZABLE"
    );
  });

  await test("7. Varias paradas con balance de combustible coherente, sin retroceso", async () => {
    const puntoS1 = puntoAKm(70);
    const puntoS2 = puntoAKm(250);
    const estS1 = estacion({ lat: puntoS1.lat, lng: puntoS1.lng, precio: 1.5 });
    // 25 candidatas adicionales en la misma ventana que S2 para comprobar
    // que no se verifican todas por carretera (solo un número acotado).
    const relleno = Array.from({ length: 25 }, (_, i) =>
      estacion({ lat: puntoAKm(255 + i).lat, lng: puntoAKm(255 + i).lng, precio: 1.9 - i * 0.001 })
    );
    const estS2 = estacion({ lat: puntoS2.lat, lng: puntoS2.lng, precio: 1.45 });
    const { fn, llamadas } = crearMockFetch({});
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    const plan = await planificarViaje(
      puntoAKm(0), puntoAKm(400), "Destino", [estS1, estS2, ...relleno], VEHICULO, COMBUSTIBLE, 100, null
    );
    assert.equal(plan.paradas.length, 2, `se esperaban 2 paradas, hubo ${plan.paradas.length}`);
    assert(plan.paradas[0].kmDesdeOrigen < plan.paradas[1].kmDesdeOrigen, "las paradas deben ir en orden creciente de km, sin retroceso");
    assert.equal(plan.paradas[0].litrosARepostar, plan.paradas[1].litrosARepostar, "mismo criterio de repostaje parcial en cada parada");
    assert.equal(plan.paradas[0].autonomiaTrasRepostarKm, plan.paradas[1].autonomiaTrasRepostarKm, "autonomía tras repostar coherente (no se reinicia al depósito completo)");
    const idsParadas = new Set(plan.paradas.map((p) => p.gasolinera.id));
    assert.equal(idsParadas.size, 2, "no debe repetirse ninguna gasolinera");
    // Petición principal + como mucho MAX_CANDIDATOS_VERIFICAR_POR_TRAMO (3) por cada una de las 2 paradas.
    assert(llamadas.length <= 1 + 3 * 2, `no debe dispararse una petición por cada estación cercana (hubo ${llamadas.length} llamadas con 27 candidatas disponibles)`);
  });

  await test("8. Preferencia de marca sin alternativas alcanzables en ese tramo", async () => {
    const punto = puntoAKm(40);
    const estShell = estacion({ lat: punto.lat, lng: punto.lng, precio: 1.5, nombre: "Shell Prueba" });
    const { fn } = crearMockFetch({});
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    await esperaError(
      planificarViaje(puntoAKm(0), puntoAKm(150), "Destino", [estShell], VEHICULO, COMBUSTIBLE, 60, "repsol"),
      "SIN_PARADA_ALCANZABLE_MARCA"
    );
    // Sin preferencia de marca, la misma estación sí resuelve el plan.
    const plan = await planificarViaje(puntoAKm(0), puntoAKm(150), "Destino", [estShell], VEHICULO, COMBUSTIBLE, 60, null);
    assert.equal(plan.paradas.length, 1);
  });

  await test("9a. Fallo de red en la ruta principal: no cuelga, lanza error", async () => {
    const { fn } = crearMockFetch({ fallarSiempre: true });
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    await assert.rejects(planificarViaje(puntoAKm(0), puntoAKm(100), "Destino", [], VEHICULO, COMBUSTIBLE, 200, null));
  });

  await test("9b. Respuesta vacía/malformada de la ruta principal", async () => {
    const { fn } = crearMockFetch({ respuestaVacia: true });
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    await esperaError(
      planificarViaje(puntoAKm(0), puntoAKm(100), "Destino", [], VEHICULO, COMBUSTIBLE, 200, null),
      "RUTA_NO_ENCONTRADA"
    );
  });

  await test("9c. Fallo solo en las verificaciones de desvío: se degrada con claridad, no crashea", async () => {
    const punto = puntoAKm(40);
    const est = estacion({ lat: punto.lat, lng: punto.lng, precio: 1.5 });
    const { fn } = crearMockFetch({
      // La primera llamada (ruta principal) funciona; todas las siguientes
      // (verificación de desvío a estaciones) fallan.
      fallarSoloEn: (_url, numLlamada) => numLlamada > 1,
    });
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    await esperaError(
      planificarViaje(puntoAKm(0), puntoAKm(150), "Destino", [est], VEHICULO, COMBUSTIBLE, 60, null),
      "SIN_PARADA_ALCANZABLE"
    );
  });

  await test("9d. Las peticiones de verificación llevan señal de cancelación (AbortSignal)", async () => {
    const punto = puntoAKm(40);
    const est = estacion({ lat: punto.lat, lng: punto.lng, precio: 1.5 });
    const { fn, llamadas } = crearMockFetch({});
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    await planificarViaje(puntoAKm(0), puntoAKm(150), "Destino", [est], VEHICULO, COMBUSTIBLE, 60, null);
    assert(llamadas.every((l) => l.signal instanceof AbortSignal), "toda petición a OSRM debe llevar un AbortSignal para poder cancelarse");
  });

  console.log(`\n${pasados} pasadas, ${fallidos} fallidas`);
  if (fallidos > 0) process.exitCode = 1;
}

main();
