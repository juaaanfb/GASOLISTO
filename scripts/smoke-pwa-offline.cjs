// Prueba focalizada pedida por Cerebro Central el 01/11/2026: desconexión
// y recuperación reales con el service worker ACTIVO, en el entorno
// aislado de Playwright, sin desconectar el ordenador ni tocar el Chrome
// personal. Requiere un build de producción real (ver README al final).
//
// Nota importante de este intento, documentada también en el informe:
// context.setOffline() de Playwright (y el aborto de peticiones vía
// page.route(), y Network.emulateNetworkConditions enviado directamente a
// la sesión CDP del propio service worker) NO bloquean el fetch() que el
// service worker hace desde su propio hilo al manejar una navegación: las
// tres vías se probaron y en las tres la petición llegó igualmente al
// servidor real (confirmado con response.fromServiceWorker() === true y
// cabeceras de respuesta reales del servidor). Es una limitación del
// entorno de pruebas, no un comportamiento del producto. Por eso esta
// prueba simula la desconexión de la forma que SÍ es fiable aquí: parando
// el propio proceso del servidor (ECONNREFUSED real, no emulado), que el
// script controla de principio a fin.

const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");

const PORT = process.env.SMOKE_PORT || "3002";
const baseURL = `http://localhost:${PORT}`;
const output = process.env.SMOKE_OUTPUT || path.join(require("node:os").tmpdir(), "gasolisto-pwa-offline");
const buildDir = process.env.NEXT_BUILD_DIR || ".next-pwa-offline-test";
const projectDir = path.join(__dirname, "..");

function esperarHasta(predicado, timeoutMs = 8000, pasoMs = 50) {
  const limite = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    (function intento() {
      Promise.resolve(predicado()).then((ok) => {
        if (ok) return resolve();
        if (Date.now() > limite) return reject(new Error("timeout esperando condición"));
        setTimeout(intento, pasoMs);
      }).catch((e) => {
        if (Date.now() > limite) return reject(e);
        setTimeout(intento, pasoMs);
      });
    })();
  });
}

function esperarPuertoListo(port, timeoutMs = 20000) {
  return esperarHasta(async () => {
    try {
      const r = await fetch(`http://localhost:${port}/`);
      return r.status < 500;
    } catch {
      return false;
    }
  }, timeoutMs, 200);
}

function arrancarServidor() {
  const env = { ...process.env, NEXT_BUILD_DIR: buildDir, PORT: String(PORT) };
  const proc = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: projectDir,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  return proc;
}

function pararServidor(proc) {
  return new Promise((resolve) => {
    if (!proc || proc.killed || proc.exitCode !== null) return resolve();
    proc.once("exit", () => resolve());
    // En Windows, SIGTERM a un proceso de Node lanzado así no siempre basta
    // para liberar el puerto de inmediato; forzar con taskkill /F es lo
    // fiable aquí (coherente con cómo se paró el servidor manual durante
    // el diagnóstico de esta misma prueba).
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(proc.pid), "/f", "/t"]);
    } else {
      proc.kill("SIGKILL");
    }
  });
}

async function run() {
  fs.mkdirSync(output, { recursive: true });
  const resultados = [];
  let servidor = arrancarServidor();
  try {
    await esperarPuertoListo(PORT);

    const browser = await chromium.launch({
      headless: true,
      ...(process.env.SMOKE_BROWSER_PATH ? { executablePath: process.env.SMOKE_BROWSER_PATH } : {}),
    });
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();

      // 1. Primera visita online: SW activo de verdad (no solo que
      // register() resuelva).
      await page.goto(`${baseURL}/`);
      await esperarHasta(() => page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        return reg?.active?.state === "activated";
      }), 8000);
      const swActivo = await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        return { scope: reg?.scope, estado: reg?.active?.state, script: reg?.active?.scriptURL };
      });
      assert.equal(swActivo.estado, "activated", "el service worker debe quedar activo tras la primera visita");
      resultados.push(`SW activo: ${JSON.stringify(swActivo)}`);

      await esperarHasta(() => page.evaluate(async () => {
        const cache = await caches.open("gasolisto-v1-shell");
        return !!(await cache.match("/"));
      }), 4000);
      await page.screenshot({ path: path.join(output, "01-online-home.png") });

      const privacidadCacheada = await page.evaluate(async () => {
        const cache = await caches.open("gasolisto-v1-shell");
        return !!(await cache.match("/privacidad"));
      });
      assert.equal(privacidadCacheada, false, "/privacidad no debe guardarse como página completa en el shell");
      resultados.push("/privacidad NO cacheada como página completa (correcto, por diseño); no se visita online antes de la prueba sin conexión.");

      // 2. Desconexión REAL: se para el servidor (ECONNREFUSED genuino).
      // Documentado arriba por qué no se usa context.setOffline() aquí: no
      // bloquea el fetch() que hace el propio service worker.
      await pararServidor(servidor);
      servidor = null;
      await esperarHasta(async () => {
        try { await fetch(`${baseURL}/`); return false; } catch { return true; }
      }, 5000);

      // 2a. Home ("/"): tiene shell cacheado — debe recuperarse sin conexión.
      const respHomeOffline = await page.goto(`${baseURL}/`, { waitUntil: "load", timeout: 8000 }).catch((e) => e);
      const tituloHomeOffline = await page.title().catch(() => null);
      const homeFallo = respHomeOffline instanceof Error;
      resultados.push(
        homeFallo
          ? `"/" con el servidor caído: la navegación falló (${respHomeOffline.message}) — NO se recuperó del shell.`
          : `"/" con el servidor caído: se recuperó del shell y mostró "${tituloHomeOffline}".`
      );
      assert.equal(homeFallo, false, '"/" debe recuperarse del shell cacheado cuando el servidor es inalcanzable');
      assert.match(tituloHomeOffline || "", /Gasolisto/, '"/" sin servidor debe mostrar el shell real');
      await page.screenshot({ path: path.join(output, "02-sin-servidor-home-recuperada.png") }).catch(() => {});

      // 2b. Página auxiliar sin shell propio: debe fallar de forma honesta,
      // nunca mostrar el contenido de otra página bajo esta ruta.
      const respPrivOffline = await page.goto(`${baseURL}/privacidad`, { waitUntil: "load", timeout: 8000 }).catch((e) => e);
      const tituloPrivOffline = await page.title().catch(() => null);
      const privFallo = respPrivOffline instanceof Error;
      resultados.push(
        privFallo
          ? `"/privacidad" con el servidor caído: la navegación falló tal cual se esperaba (${respPrivOffline.message}). El navegador muestra su propia pantalla de "sin conexión", no contenido de Gasolisto bajo esta ruta.`
          : `"/privacidad" con el servidor caído: la página respondió igualmente con título "${tituloPrivOffline}" (inesperado, revisar).`
      );
      assert.equal(privFallo, true, '"/privacidad" debe fallar honestamente cuando no hay shell propio ni servidor disponible, nunca mostrar otra página');
      await page.screenshot({ path: path.join(output, "03-sin-servidor-privacidad-falla.png") }).catch(() => {});

      // 3. Recuperación: servidor de vuelta, /privacidad vuelve a cargar su
      // contenido real.
      servidor = arrancarServidor();
      await esperarPuertoListo(PORT);
      await page.goto(`${baseURL}/privacidad`, { waitUntil: "load" });
      const tituloPrivRecuperada = await page.title();
      assert.match(tituloPrivRecuperada, /Privacidad/, "/privacidad debe recuperar su contenido real al volver el servidor");
      resultados.push(`Recuperación: servidor de vuelta → "/privacidad" título "${tituloPrivRecuperada}" (correcto).`);
      await page.screenshot({ path: path.join(output, "04-recuperada.png") });

      fs.writeFileSync(
        path.join(output, "resultados.md"),
        "# Resultados — PWA: servidor caído / recuperación (desconexión real, no emulada)\n\n" +
        "Nota: context.setOffline() y page.route() abort NO bloquean el fetch() del propio\n" +
        "service worker en este entorno (confirmado); por eso la prueba para el servidor\n" +
        "real en vez de emular la red. Ver cabecera del script para el detalle.\n\n" +
        resultados.map((r) => `- ${r}`).join("\n") + "\n"
      );
      console.log("PASS PWA: servidor caído / recuperación (home recupera shell; /privacidad falla honestamente, no sirve contenido equivocado; recupera al volver el servidor)");
      resultados.forEach((r) => console.log("  - " + r));
      await context.close();
    } finally {
      await browser.close();
    }
  } finally {
    await pararServidor(servidor);
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });

// README para reproducir:
// 1. Build de producción en un directorio alternativo (evita el conflicto
//    de symlinks de OneDrive si hay un `next dev` corriendo a la vez):
//      NEXT_BUILD_DIR=.next-pwa-offline-test npx next build
//    (restaurar tsconfig.json a su contenido de HEAD después: Next.js lo
//    reescribe para añadir esa carpeta a "include").
// 2. Ejecutar esta prueba (arranca y para el servidor ella misma):
//      PLAYWRIGHT_MODULE_PATH=<ruta al playwright aislado> node scripts/smoke-pwa-offline.cjs
