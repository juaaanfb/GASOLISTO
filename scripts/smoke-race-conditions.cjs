// Pruebas focalizadas para dos condiciones de carrera señaladas por
// Cerebro Central el 01/11/2026 sobre la entrega del 30/10:
//
// 1. TripPlanner: una respuesta de OSRM retrasada, resuelta después de
//    cambiar la autonomía (u otro parámetro) sin recalcular, no debe
//    publicar el plan ni registrarlo como "vigente completado".
// 2. AutocompleteInput: una respuesta de geocodificación retrasada y
//    fuera de orden no debe reabrir el desplegable con un resultado de
//    una consulta ya abandonada (cambiada, limpiada o confirmada).
//
// Reutiliza los mismos mocks/arranque que scripts/smoke-ui.cjs. No se
// envía tráfico a PostHog/Vercel Analytics ni a ningún proveedor real
// (Photon/OSRM quedan completamente interceptados).

const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");

const baseURL = process.env.SMOKE_URL || "http://localhost:3019";
const output = process.env.SMOKE_OUTPUT || path.join(require("node:os").tmpdir(), "gasolisto-race");
const station = {
  id: "smoke", nombre: "Estacion de prueba", direccion: "Calle prueba",
  localidad: "Madrid", provincia: "Madrid", codigoPostal: "28001",
  latitud: 40.4168, longitud: -3.7038, horario: "24H",
  precios: { gasolina95: 1.5, diesel: 1.4 }, ultimaActualizacion: "09/10/2026",
};

function esperarHasta(predicado, timeoutMs = 4000, pasoMs = 20) {
  const limite = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    (function intento() {
      if (predicado()) return resolve();
      if (Date.now() > limite) return reject(new Error("timeout esperando condición"));
      setTimeout(intento, pasoMs);
    })();
  });
}

async function nuevaPagina(browser, { geo = "denied" } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript((geo) => {
    localStorage.setItem("gasolisto_onboarding_visto", "1");
    localStorage.setItem("gasolisto_analytics_consent_v1", "rejected");
    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition: (success, error) => {
        if (geo === "allowed") success({ coords: { latitude: 40.4168, longitude: -3.7038, accuracy: 20 } });
        else error({ code: 1 });
      } },
    });
  }, geo);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/https:\/\/[^/]*(posthog\.com|vercel-insights\.com)\//, (route) => route.abort());
  await page.route("**/_vercel/insights/**", (route) => route.abort());
  await page.route("**/api/gasolineras", (route) => route.fulfill({ json: { ok: true, datos: [station] } }));
  return { context, page, errors };
}

// ─── 1. TripPlanner: respuesta OSRM obsoleta tras cambiar la autonomía ────

async function testViajeObsoleto(browser) {
  const { context, page, errors } = await nuevaPagina(browser, { geo: "allowed" });

  await page.route("https://photon.komoot.io/**", (route) => route.fulfill({ json: { features: [{
    geometry: { coordinates: [-0.3763, 39.4699] },
    properties: { name: "Valencia", countrycode: "ES", osm_value: "city" },
  }] } }));

  let liberarRutaLenta;
  const rutaLentaLista = new Promise((resolve) => { liberarRutaLenta = resolve; });
  let peticionesOSRM = 0;
  await page.route("https://router.project-osrm.org/**", async (route) => {
    peticionesOSRM++;
    // La petición principal (ruta) se retiene a propósito: representa la
    // respuesta "antigua" que llega después de que el usuario ya cambió
    // la autonomía sin volver a pulsar Calcular.
    await rutaLentaLista;
    return route.fulfill({ json: { code: "Ok", routes: [{
      distance: 5000, // corto a propósito: con 200 km de autonomía, cero paradas → una sola petición OSRM
      geometry: { coordinates: [[-3.7038, 40.4168], [-3.60, 40.30], [-3.40, 40.00], [-0.3763, 39.4699]] },
    }] } });
  });

  await page.goto(baseURL);
  await page.getByRole("button", { name: "Viaje", exact: true }).click();
  await page.getByPlaceholder("¿A dónde vas?").fill("Valencia");
  await page.getByRole("button", { name: "Valencia", exact: true }).click();
  await page.getByPlaceholder("Ej: 120").fill("200");
  await page.getByRole("button", { name: "Calcular ruta", exact: true }).click();

  // Esperar a que la petición OSRM esté realmente en vuelo (retenida)
  // antes de tocar nada más — si no, el cambio de autonomía podría
  // adelantarse a que calcular() siquiera empiece.
  await esperarHasta(() => peticionesOSRM > 0, 4000);
  await page.getByRole("button", { name: "Calculando ruta…", exact: true }).waitFor();

  // Cambiar la autonomía MIENTRAS la petición antigua sigue en vuelo, sin
  // volver a pulsar Calcular.
  await page.getByPlaceholder("Ej: 120").fill("5");
  await page.waitForTimeout(250); // deja aplicarse el efecto de invalidación

  // Ahora se libera la respuesta retrasada de la petición ANTIGUA (200 km).
  liberarRutaLenta();
  await page.waitForTimeout(800); // margen de sobra para que, si hubiera bug, el plan obsoleto apareciera

  assert.equal(peticionesOSRM, 1, "solo debía haberse lanzado una petición OSRM en este escenario");
  assert.equal(
    await page.getByText(/Con 200 km de autonomía/).count(), 0,
    "el plan calculado con la autonomía antigua (200 km) no debe aparecer"
  );
  assert.equal(
    await page.getByText("Distancia", { exact: true }).count(), 0,
    "no debe mostrarse ningún resultado (distancia/paradas) de la petición obsoleta"
  );
  assert.equal(
    await page.getByPlaceholder("Ej: 120").inputValue(), "5",
    "el valor de autonomía vigente no debe haberse sobrescrito"
  );
  const boton = page.getByRole("button", { name: "Calcular ruta", exact: true });
  await boton.waitFor();
  assert.equal(await boton.isEnabled(), true, "debe poder recalcularse tras descartar la respuesta obsoleta");
  assert.deepEqual(errors, []);

  await page.screenshot({ path: path.join(output, "viaje-respuesta-obsoleta-descartada.png") });
  await context.close();
  console.log("PASS Viajes: respuesta OSRM obsoleta tras cambiar autonomía se descarta sin publicar el plan");
}

// ─── 2. AutocompleteInput: respuestas tardías/fuera de orden ──────────────

async function testAutocompleteCambiarConsulta(browser) {
  const { context, page, errors } = await nuevaPagina(browser);

  let liberarAntigua;
  const antiguaLista = new Promise((resolve) => { liberarAntigua = resolve; });
  const consultasVistas = [];
  await page.route("https://photon.komoot.io/**", async (route) => {
    const q = new URL(route.request().url()).searchParams.get("q");
    consultasVistas.push(q);
    if (q === "Mad") {
      await antiguaLista; // respuesta "antigua": se retiene a propósito
      return route.fulfill({ json: { features: [{
        geometry: { coordinates: [-3.7038, 40.4168] },
        properties: { name: "RESULTADO_ANTIGUO_MAD", countrycode: "ES", osm_value: "city" },
      }] } });
    }
    return route.fulfill({ json: { features: [{
      geometry: { coordinates: [-0.3763, 39.4699] },
      properties: { name: "RESULTADO_NUEVO_VALENCIA", countrycode: "ES", osm_value: "city" },
    }] } });
  });

  await page.goto(baseURL);
  const input = page.getByPlaceholder("Busca ciudad o zona");
  await input.fill("Mad");
  await esperarHasta(() => consultasVistas.includes("Mad"), 4000);

  // Cambiar la consulta MIENTRAS "Mad" sigue en vuelo. clearTimeout solo
  // cancela un debounce pendiente, no una petición que el navegador ya
  // envió — es justo el caso que no debe reabrir el desplegable más tarde.
  await input.fill("Valencia");
  await page.getByRole("button", { name: "RESULTADO_NUEVO_VALENCIA", exact: false }).waitFor({ timeout: 4000 });

  liberarAntigua();
  await page.waitForTimeout(500); // margen de sobra para que, si hubiera bug, reabriera con el resultado antiguo

  assert.equal(
    await page.getByText("RESULTADO_ANTIGUO_MAD", { exact: false }).count(), 0,
    "una respuesta tardía de una consulta ya abandonada no debe aparecer en el desplegable"
  );
  assert.equal(
    await page.getByRole("button", { name: "RESULTADO_NUEVO_VALENCIA", exact: false }).count(), 1,
    "el desplegable debe seguir reflejando la consulta vigente"
  );
  assert.deepEqual(errors, []);
  await context.close();
  console.log("PASS Autocompletado: cambiar la consulta — la respuesta antigua no reabre el desplegable");
}

async function testAutocompleteLimpiar(browser) {
  const { context, page, errors } = await nuevaPagina(browser);

  let liberarAntigua;
  const antiguaLista = new Promise((resolve) => { liberarAntigua = resolve; });
  const consultasVistas = [];
  await page.route("https://photon.komoot.io/**", async (route) => {
    const q = new URL(route.request().url()).searchParams.get("q");
    consultasVistas.push(q);
    await antiguaLista;
    return route.fulfill({ json: { features: [{
      geometry: { coordinates: [-3.7038, 40.4168] },
      properties: { name: "RESULTADO_ANTIGUO_TRAS_LIMPIAR", countrycode: "ES", osm_value: "city" },
    }] } });
  });

  await page.goto(baseURL);
  const input = page.getByPlaceholder("Busca ciudad o zona");
  await input.fill("Mad");
  await esperarHasta(() => consultasVistas.includes("Mad"), 4000);

  // Limpiar el campo MIENTRAS la petición sigue en vuelo (mismo onChange("")
  // que dispara el botón "X" del input).
  await input.fill("");
  await page.waitForTimeout(100);

  liberarAntigua();
  await page.waitForTimeout(500);

  assert.equal(
    await page.getByText("RESULTADO_ANTIGUO_TRAS_LIMPIAR", { exact: false }).count(), 0,
    "limpiar el campo y luego recibir una respuesta tardía no debe reabrir el desplegable"
  );
  assert.equal(await input.inputValue(), "", "el campo debe seguir vacío");
  assert.deepEqual(errors, []);
  await context.close();
  console.log("PASS Autocompletado: limpiar — la respuesta antigua no reabre el desplegable");
}

async function run() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.SMOKE_BROWSER_PATH ? { executablePath: process.env.SMOKE_BROWSER_PATH } : {}),
  });
  try {
    await testViajeObsoleto(browser);
    await testAutocompleteCambiarConsulta(browser);
    await testAutocompleteLimpiar(browser);
  } finally {
    await browser.close();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
