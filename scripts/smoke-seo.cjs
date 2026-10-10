const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");

const baseURL = process.env.SMOKE_URL || "http://localhost:3021";
const output = process.env.SMOKE_OUTPUT || path.join(require("node:os").tmpdir(), "gasolisto-seo");

async function run() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.SMOKE_BROWSER_PATH ? { executablePath: process.env.SMOKE_BROWSER_PATH } : {}),
  });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 720 }]) {
      const context = await browser.newContext({ viewport, serviceWorkers: "block" });
      const page = await context.newPage();
      // Allow only the document and build assets, including with randomized analytics intake paths.
      await page.route("**/*", (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const allowed = url.origin === new URL(baseURL).origin && request.method() === "GET"
          && (url.pathname.startsWith("/_next/") || ["/como-funciona", "/privacidad", "/favicon.ico"].includes(url.pathname));
        return allowed ? route.continue() : route.abort();
      });
      for (const route of ["/como-funciona", "/privacidad"]) {
        const response = await page.goto(`${baseURL}${route}`);
        assert.equal(response.status(), 200);
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://gasolisto.com${route}`);
        assert.equal(await page.locator("h1").count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (route === "/como-funciona") {
          const faq = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) =>
            nodes.map((node) => JSON.parse(node.textContent)).find((data) => data["@type"] === "FAQPage"));
          assert.equal(faq.mainEntity.length, 7);
          const text = await page.locator("body").innerText();
          assert(text.includes("Puedes buscar una ciudad o zona"));
          assert(text.includes("no garantizamos actualizaciones al instante"));
          assert(text.includes("aproximación en línea recta"));
          for (const item of faq.mainEntity) {
            assert(text.includes(item.name));
            assert(text.includes(item.acceptedAnswer.text));
          }
          await page.screenshot({ path: path.join(output, `como-funciona-${viewport.width}.png`), fullPage: true });
        } else {
          const text = await page.locator("body").innerText();
          assert(text.includes("PostHog"));
          assert(text.includes("OSRM recibe las coordenadas de origen y destino"));
          assert(!text.includes("no hay forma de identificarte"));
          assert(!text.includes("nunca se envía a nuestros servidores"));
          assert.equal(await page.getByRole("link", { name: "contacto.gasolisto@gmail.com" }).getAttribute("href"), "mailto:contacto.gasolisto@gmail.com");
          await page.screenshot({ path: path.join(output, `privacidad-${viewport.width}.png`), fullPage: true });
        }
      }
      await context.close();
      console.log(`PASS SEO/FAQ ${viewport.width}x${viewport.height}`);
    }
    const sitemap = await fetch(`${baseURL}/sitemap.xml`);
    assert.equal(sitemap.status, 200);
    const xml = await sitemap.text();
    assert(xml.includes("https://gasolisto.com/como-funciona"));
    assert(xml.includes("2026-10-09T00:00:00.000Z"));
    assert(xml.includes("2026-10-10T00:00:00.000Z"));
    const robots = await fetch(`${baseURL}/robots.txt`);
    assert.equal(robots.status, 200);
    assert((await robots.text()).includes("Sitemap: https://gasolisto.com/sitemap.xml"));
    console.log("PASS sitemap/robots");
  } finally {
    await browser.close();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
