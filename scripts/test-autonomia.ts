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

function cerca(a: Coordenadas, b: Coordenadas): boolean {
  return Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6;
}

// ─── Mock de fetch (OSRM) ──────────────────────────────────────────────────
//
// Cada test instala su propio mock. Reconoce dos formas de URL:
// - 2 puntos (origen;destino): la ruta principal. Devuelve una geometría
//   interpolada (1 punto/km sobre la distancia en línea recta real entre
//   los puntos) y, salvo que se fuerce distanciaPrincipalKm, una
//   "distance" total igual a esa misma distancia en línea recta.
// - 3 puntos (puntoRuta;estación;puntoRuta): verificación de ida+vuelta en
//   una sola petición (igual que hace ahora obtenerIdaVueltaConTimeout).
//   Devuelve routes[0].legs con la distancia de cada tramo por separado,
//   para poder simular ida y vuelta distintas (no simétricas).
interface LlamadaFetch { url: string; signal?: AbortSignal | null }
interface Inflacion { puntoRuta: Coordenadas; estacion: Coordenadas; idaKm?: number; vueltaKm?: number }

function crearMockFetch(opciones: {
  inflaciones?: Inflacion[];
  distanciaPrincipalKm?: number;
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
    if (opciones.respuestaVacia) {
      return { ok: true, json: async () => ({}) } as Response;
    }

    const tramo = url.split("driving/")[1]?.split("?")[0] ?? "";
    const puntosUrl: Coordenadas[] = tramo.split(";").map((par) => {
      const [lng, lat] = par.split(",").map(Number);
      return { lat, lng };
    });
    if (puntosUrl.length < 2) throw new Error("URL_NO_RECONOCIDA_EN_MOCK: " + url);

    if (puntosUrl.length === 3) {
      // Verificación de ida+vuelta.
      const [puntoRuta, est] = puntosUrl;
      const inflacion = opciones.inflaciones?.find((i) => cerca(i.puntoRuta, puntoRuta) && cerca(i.estacion, est));
      const idaKm = inflacion?.idaKm ?? calcularDistancia(puntoRuta, est);
      const vueltaKm = inflacion?.vueltaKm ?? calcularDistancia(est, puntoRuta);
      return {
        ok: true,
        json: async () => ({
          code: "Ok",
          routes: [{ distance: (idaKm + vueltaKm) * 1000, legs: [{ distance: idaKm * 1000 }, { distance: vueltaKm * 1000 }] }],
        }),
      } as Response;
    }

    // Ruta principal.
    const [desde, hasta] = puntosUrl;
    const distanciaLineaRecta = calcularDistancia(desde, hasta);
    const distanciaReportada = opciones.distanciaPrincipalKm ?? distanciaLineaRecta;
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
        routes: [{ distance: distanciaReportada * 1000, geometry: { coordinates } }],
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

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
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
      // A está cerca en línea recta pero por carretera son 30 km de ida
      // (y 30 de vuelta): inalcanzable dentro del margen (51 km), puesto
      // que 45 (ya recorridos) + 30 > 51.
      inflaciones: [{ puntoRuta: puntoA, estacion: { lat: estA.latitud, lng: estA.longitud }, idaKm: 30, vueltaKm: 30 }],
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
    const relleno = [1.6, 1.6, 1.6, 1.6].map((precio) => estacion({ lat: 10, lng: 10, precio }));
    const { fn } = crearMockFetch({
      inflaciones: [
        { puntoRuta: puntoD, estacion: { lat: estD.latitud, lng: estD.longitud }, idaKm: 0, vueltaKm: 0 },
        { puntoRuta: puntoCBase, estacion: { lat: estC.latitud, lng: estC.longitud }, idaKm: 25, vueltaKm: 25 },
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
    // El balance de combustible es individual por parada (combustible que
    // quedaba al llegar + lo repostado), así que los litros repostados NO
    // tienen por qué coincidir entre paradas -- lo que debe cumplirse
    // siempre es que cada una llega como mucho al objetivo del 75% del
    // depósito, nunca por encima de la capacidad.
    for (const parada of plan.paradas) {
      assert(parada.litrosARepostar > 0 && parada.litrosARepostar <= VEHICULO.deposito * 0.75 + 1e-9,
        `litrosARepostar (${parada.litrosARepostar}) debe estar entre 0 y el 75% del depósito`);
      assert(parada.autonomiaTrasRepostarKm <= Math.round(VEHICULO.deposito / VEHICULO.consumo * 100),
        "la autonomía tras repostar nunca puede superar la del depósito lleno");
    }
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
      // (verificación de ida+vuelta) fallan.
      fallarSoloEn: (_url, numLlamada) => numLlamada > 1,
    });
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    await esperaError(
      planificarViaje(puntoAKm(0), puntoAKm(150), "Destino", [est], VEHICULO, COMBUSTIBLE, 60, null),
      "FALLO_VERIFICACION_PROVEEDOR"
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

  // ── Correcciones revisadas por Cerebro Central (30/10/2026) ──────────────

  await test("10. Combustible restante conservado y capacidad del depósito respetada", async () => {
    const punto = puntoAKm(10);
    const est = estacion({ lat: punto.lat, lng: punto.lng, precio: 1.5 }); // en ruta, sin desvío
    const { fn } = crearMockFetch({});
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    // Depósito 20L, consumo 6L/100km. Autonomía inicial 60km, parada a
    // 10km: quedan 50km de autonomía al llegar = 3L. Objetivo 75% del
    // depósito = 15L. Repostaje esperado = 15 - 3 = 12L, NUNCA 15L fijos
    // (eso excedería lo que de verdad falta para llegar al objetivo).
    const plan = await planificarViaje(puntoAKm(0), puntoAKm(150), "Destino", [est], VEHICULO, COMBUSTIBLE, 60, null);
    assert.equal(plan.paradas.length, 1);
    const parada = plan.paradas[0];
    assert.equal(parada.litrosARepostar, 12, `se esperaban 12L repostados (3L restantes + 12L = 15L, 75% del depósito), se obtuvieron ${parada.litrosARepostar}L`);
    const litrosRestantesAlLlegar = 3;
    assert(
      parada.litrosARepostar + litrosRestantesAlLlegar <= VEHICULO.deposito + 1e-9,
      "el combustible resultante no puede superar la capacidad del depósito"
    );
    assert.equal(parada.autonomiaTrasRepostarKm, 250, "15L a 6L/100km = 250km de autonomía tras repostar");
  });

  await test("11. Dos candidatas alcanzables cuyo orden cambia al verificar el desvío real", async () => {
    const puntoA = puntoAKm(30);
    const puntoB = puntoAKm(35);
    // A: más barata y más cerca en línea recta -> gana el orden inicial
    // (preselección barata). Pero su desvío REAL verificado es grande.
    const estA = estacion({ lat: puntoA.lat + 0.018, lng: puntoA.lng, precio: 1.40 });
    // B: algo más cara y más lejos en línea recta -> pierde el orden
    // inicial. Pero su desvío REAL verificado es pequeño: acaba
    // compensando más que A una vez comprobado por carretera.
    const estB = estacion({ lat: puntoB.lat + 0.054, lng: puntoB.lng, precio: 1.50 });
    const relleno = [1.70, 1.70, 1.70].map((precio) => estacion({ lat: 10, lng: 10, precio })); // precio de referencia = 1.60
    const { fn } = crearMockFetch({
      inflaciones: [
        { puntoRuta: puntoA, estacion: { lat: estA.latitud, lng: estA.longitud }, idaKm: 25, vueltaKm: 25 },
        { puntoRuta: puntoB, estacion: { lat: estB.latitud, lng: estB.longitud }, idaKm: 3, vueltaKm: 3 },
      ],
    });
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    const plan = await planificarViaje(puntoAKm(0), puntoAKm(200), "Destino", [estA, estB, ...relleno], VEHICULO, COMBUSTIBLE, 100, null);
    assert.equal(plan.paradas.length, 1);
    assert.equal(plan.paradas[0].gasolinera.id, estB.id, "tras verificar el desvío real, B debe ganar a A aunque A fuera la preselección inicial más barata/cercana");
    assert(plan.paradas[0].ahorroNetoEstimado > 0, "B debe salir con ahorro neto positivo");
  });

  await test("12. Ida corta y regreso largo: no se asume simetría", async () => {
    const puntoParada1 = puntoAKm(20);
    const est1 = estacion({ lat: puntoParada1.lat + 0.01, lng: puntoParada1.lng, precio: 1.5 });
    const puntoParada2 = puntoAKm(150); // en ruta, sin desvío: resuelve el 2º tramo con holgura si hace falta
    const est2 = estacion({ lat: puntoParada2.lat, lng: puntoParada2.lng, precio: 1.5 });
    const { fn } = crearMockFetch({
      inflaciones: [
        // Ida corta (2km) pero regreso largo (20km): con depósito 20L y
        // consumo 6L/100km, repostar al 75% (15L tras repostar = 250km de
        // autonomía bruta) menos un regreso de 20km deja 230km de
        // autonomía real para el siguiente tramo. Si se asumiera
        // (erróneamente) que el regreso = la ida (2km), quedarían 248km:
        // suficiente para llegar directo a destino sin una 2ª parada. Con
        // el regreso real (20km) NO llega, y hace falta una 2ª parada.
        { puntoRuta: puntoParada1, estacion: { lat: est1.latitud, lng: est1.longitud }, idaKm: 2, vueltaKm: 20 },
      ],
    });
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    const plan = await planificarViaje(puntoAKm(0), puntoAKm(220), "Destino", [est1, est2], VEHICULO, COMBUSTIBLE, 60, null);
    assert.equal(plan.paradas.length, 2, `con el regreso real (20km, no simétrico a la ida de 2km) hacen falta 2 paradas para llegar a 220km; hubo ${plan.paradas.length}`);
    assert.equal(plan.paradas[0].desvioKm, 22, "el desvío mostrado debe ser ida+vuelta reales (2+20), no 2*ida");
  });

  await test("13. Límite de paradas sin alcanzar destino: error, no un plan normal", async () => {
    // Depósito pequeño (10L) a propósito: cada parada da poca autonomía
    // extra, así que una ruta muy larga agota el máximo de paradas antes
    // de llegar.
    const vehiculoPequeno: Vehiculo = { id: "v2", nombre: "Depósito pequeño", combustible: "gasolina95", consumo: 6, deposito: 10 };
    const gasolineras = Array.from({ length: 30 }, (_, i) => {
      const p = puntoAKm(80 * (i + 1));
      return estacion({ lat: p.lat, lng: p.lng, precio: 1.5 });
    });
    const { fn } = crearMockFetch({});
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    await esperaError(
      planificarViaje(puntoAKm(0), puntoAKm(3000), "Destino", gasolineras, vehiculoPequeno, COMBUSTIBLE, 100, null),
      "LIMITE_PARADAS_SIN_LLEGAR"
    );
  });

  await test("14. Coherencia del resumen económico con las paradas", async () => {
    const { fn } = crearMockFetch({});
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    const gasolineras = [estacion({ lat: puntoAKm(30).lat, lng: puntoAKm(30).lng, precio: 1.5 })];
    const plan = await planificarViaje(puntoAKm(0), puntoAKm(150), "Destino", gasolineras, VEHICULO, COMBUSTIBLE, 60, null);
    assert.equal(plan.paradas.length, 1);
    const sumaRepostajes = redondear(plan.paradas.reduce((acc, p) => acc + p.costeRepostaje, 0));
    const sumaAhorro = redondear(plan.paradas.reduce((acc, p) => acc + p.ahorroNetoEstimado, 0));
    assert.equal(plan.importeRepostajes, sumaRepostajes, "importeRepostajes debe ser exactamente la suma de costeRepostaje de cada parada");
    assert.equal(plan.ahorroEstimadoParadas, sumaAhorro, "ahorroEstimadoParadas debe ser exactamente la suma de ahorroNetoEstimado de cada parada");
    const desvioTotal = plan.paradas.reduce((acc, p) => acc + p.desvioKm, 0);
    const precioReferencia = 1.5; // única estación del dataset
    const costeEsperado = redondear(((plan.distanciaKm + desvioTotal) / 100) * VEHICULO.consumo * precioReferencia);
    assert.equal(plan.costeCombustibleEstimado, costeEsperado, "el coste de combustible del trayecto debe incluir los desvíos de las paradas, sin duplicar el ahorro");
  });

  await test("15. Coherencia de escala: geometría reescalada a la distancia total de OSRM", async () => {
    // El mock reporta una distancia total (115km) notablemente distinta de
    // la que sumaría la geometría interpolada en línea recta real entre
    // origen y destino (~100km): simula un caso donde la geometría de la
    // ruta no coincide exactamente con lo que declara el proveedor.
    const { fn } = crearMockFetch({ distanciaPrincipalKm: 115 });
    (globalThis as { fetch: typeof fetch }).fetch = fn as unknown as typeof fetch;
    const plan = await planificarViaje(puntoAKm(0), puntoAKm(100), "Destino", [], VEHICULO, COMBUSTIBLE, 200, null);
    assert.equal(plan.distanciaKm, 115, "la distancia total debe ser siempre la que declara OSRM, no la suma de la geometría");
    assert(
      plan.avisos.some((a) => /geometr/i.test(a)),
      "debe avisar de que la geometría se reescaló para no subestimar el combustible necesario"
    );
  });

  console.log(`\n${pasados} pasadas, ${fallidos} fallidas`);
  if (fallidos > 0) process.exitCode = 1;
}

main();
