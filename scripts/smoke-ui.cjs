const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");

const baseURL = process.env.SMOKE_URL || "http://localhost:3019";
const output = process.env.SMOKE_OUTPUT || path.join(require("node:os").tmpdir(), "gasolisto-smoke");
const station = {
  id: "smoke", nombre: "Estacion de prueba", direccion: "Calle prueba",
  localidad: "Madrid", provincia: "Madrid", codigoPostal: "28001",
  latitud: 40.4168, longitud: -3.7038, horario: "24H",
  precios: { gasolina95: 1.5, diesel: 1.4 }, ultimaActualizacion: "09/10/2026",
};

async function setup(browser, viewport, mode = "success") {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
    localStorage.setItem("gasolisto_onboarding_visto", "1");
    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition: (_success, error) => error({ code: 1 }) },
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/gasolineras", (route) => route.fulfill({
    status: mode === "error" ? 500 : 200,
    json: mode === "error" ? { ok: false, error: "Test failure" }
      : { ok: true, datos: mode === "empty" ? [] : [station] },
  }));
  await page.route("https://photon.komoot.io/**", (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    const destination = query !== "Madrid";
    return route.fulfill({ json: { features: [{
      geometry: { coordinates: destination ? [-0.3763, 39.4699] : [-3.7038, 40.4168] },
      properties: { name: destination ? "Valencia" : "Madrid", countrycode: "ES", osm_value: "city" },
    }] } });
  });
  await page.route("https://router.project-osrm.org/**", (route) => route.fulfill({
    json: { code: "Ok", routes: [{ distance: 350000,
      geometry: { coordinates: [[-3.7038, 40.4168], [-0.3763, 39.4699]] } }] },
  }));
  await page.goto(baseURL);
  return { context, page, errors };
}

async function run() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.SMOKE_BROWSER_PATH ? { executablePath: process.env.SMOKE_BROWSER_PATH } : {}),
  });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 720 }]) {
      const { context, page, errors } = await setup(browser, viewport);
      const input = page.getByPlaceholder("Busca ciudad o zona");
      const fallback = page.getByRole("button", { name: "Buscar ciudad", exact: true });
      await fallback.click();
      assert(await input.evaluate((el) => el === document.activeElement));
      await page.screenshot({ path: path.join(output, `fallback-${viewport.width}.png`) });
      await input.fill("Madrid");
      await page.getByRole("button", { name: "Madrid", exact: true }).click();
      await fallback.waitFor({ state: "hidden" });
      await page.getByRole("button", { name: "Lista", exact: true }).click();
      await page.getByText(station.nombre, { exact: true }).click();
      const route = page.getByRole("link", { name: "C\u00f3mo llegar con Google Maps" });
      await route.waitFor();
      await page.waitForTimeout(400);
      assert.match(await route.getAttribute("href"), /google/);
      assert.equal(await route.locator("button").count(), 0);
      assert(await route.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      }));
      await page.screenshot({ path: path.join(output, `station-${viewport.width}.png`) });
      await page.getByRole("button", { name: "Viaje", exact: true }).click();
      await page.getByPlaceholder("\u00bfA d\u00f3nde vas?").fill("Valencia");
      await page.getByRole("button", { name: "Valencia", exact: true }).click();
      await page.getByRole("button", { name: "Calcular ruta", exact: true }).click();
      await page.getByText("350 km", { exact: true }).waitFor();
      await page.screenshot({ path: path.join(output, `trip-${viewport.width}.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${viewport.width}x${viewport.height}: fallback, city, station, trip, no overflow/errors`);
    }
    for (const mode of ["error", "empty"]) {
      const { context, page, errors } = await setup(browser, { width: 390, height: 844 }, mode);
      if (mode === "error") {
        await page.getByText("No hemos podido cargar los precios", { exact: true }).waitFor();
        await page.getByRole("button", { name: "Reintentar", exact: true }).click();
        await page.getByText("No hemos podido cargar los precios", { exact: true }).waitFor();
      } else {
        await page.getByRole("button", { name: "Lista", exact: true }).click();
        await page.getByText(/No hay gasolineras con precio/).waitFor();
      }
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS API ${mode} state`);
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
