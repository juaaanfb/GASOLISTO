const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const zlib = require("node:zlib");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const baseURL = process.env.SMOKE_URL || "http://localhost:3021";
const output = process.env.SMOKE_OUTPUT || path.join(require("node:os").tmpdir(), "gasolisto-consent");

// Known PostHog ingestion endpoints (posthog-js' RequestRouter + capture()):
// /e/ (legacy capture, what this SDK version actually uses), /i/v0/e/ (newer
// event endpoint), /capture/ and /batch/ (alternate/batched capture), /s/
// (session recording, disabled in this app but kept here so an accidental
// re-enable would still be classified correctly instead of falling through).
const CAPTURE_ENDPOINT_RE = /^\/(e|i\/v0\/e|capture|batch|s)\/?$/;
const FLAGS_RE = /^\/flags\/?$/;
const CONFIG_RE = /\/array\//;

// Classify a PostHog-hostname request into exactly one of these buckets.
// Anything that is not a recognized flags/config/capture endpoint is
// "unknown" -- it is never silently folded into "capture" just because it
// isn't flags/config, so an unexpected endpoint surfaces as a real failure
// instead of a false-positive pass.
function classifyPosthogRequest(pathname) {
  if (FLAGS_RE.test(pathname)) return "flags";
  if (CONFIG_RE.test(pathname)) return "config";
  if (CAPTURE_ENDPOINT_RE.test(pathname)) return "capture";
  return "unknown";
}

// Decode a captured PostHog event request body regardless of the transport
// posthog-js chose (raw JSON, gzip, or base64-in-querystring), so the test
// can assert on the actual event payload instead of just "a request fired".
// This proves the SDK attempted to send a real, decodable event to a known
// capture endpoint intercepted by this test -- it is NOT evidence of real
// ingestion by the live PostHog project (250159), which this test never
// contacts.
function decodeCaptureBody(request) {
  const url = new URL(request.url());
  const base64Param = url.searchParams.get("compression") === "base64" ? url.searchParams.get("data") : null;
  try {
    if (base64Param) {
      return JSON.parse(Buffer.from(base64Param, "base64").toString("utf8"));
    }
    const buf = request.postDataBuffer();
    if (!buf) return null;
    try {
      return JSON.parse(zlib.gunzipSync(buf).toString("utf8"));
    } catch {
      return JSON.parse(buf.toString("utf8"));
    }
  } catch {
    return null;
  }
}

function hasPageviewEvent(capturedEvents) {
  return capturedEvents.some((batch) => {
    const events = Array.isArray(batch) ? batch : [batch];
    return events.some((e) => e && (e.event === "$pageview" || (e.batch || []).some((b) => b.event === "$pageview")));
  });
}

function assertNoSensitiveLeak(capturedEvents) {
  const serialized = JSON.stringify(capturedEvents);
  assert(!serialized.includes("private_test"), "captured event must not leak the query string");
  assert(!serialized.includes("should_not_send"), "captured event must not leak query string values");
}

async function run() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true,
    ...(process.env.SMOKE_BROWSER_PATH ? { executablePath: process.env.SMOKE_BROWSER_PATH } : {}) });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 720 }]) {
      // PostHog deliberately drops capture() for automated/headless browsers
      // (posthog-js' isLikelyBot, see @posthog/browser-common and
      // @posthog/core/utils/bot-detection) checks three independent signals:
      // navigator.webdriver (Playwright sets it true), the UA string against
      // a blocklist containing the literal "headlesschrome" substring (which
      // headless Chromium's own UA contains), and navigator.userAgentData
      // .brands (Chromium's Client Hints API, which still reports
      // "HeadlessChrome" even once the legacy UA string above is spoofed).
      // All three made every previous run of this smoke test fail by
      // design, independent of any app config. Normalizing them here only
      // affects this test harness's browser context, never the shipped app
      // code or config.
      const context = await browser.newContext({
        viewport,
        serviceWorkers: "block",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      });
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => false, configurable: true });
        const cleanBrands = [
          { brand: "Chromium", version: "131" },
          { brand: "Not_A Brand", version: "24" },
          { brand: "Google Chrome", version: "131" },
        ];
        const cleanUAData = {
          brands: cleanBrands,
          mobile: false,
          platform: "Windows",
          getHighEntropyValues: async () => ({ brands: cleanBrands, fullVersionList: cleanBrands, mobile: false, platform: "Windows" }),
          toJSON: () => ({ brands: cleanBrands, mobile: false, platform: "Windows" }),
        };
        Object.defineProperty(navigator, "userAgentData", { get: () => cleanUAData, configurable: true });
      });
      const page = await context.newPage();
      const counts = { flags: 0, config: 0, capture: 0, unknown: 0 };
      const unknownPaths = [];
      const capturedEvents = [];
      const browserErrors = [];
      const blocked = [];
      page.on("pageerror", (error) => browserErrors.push(error.message));
      await page.route("**/*", (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname === "/api/gasolineras") return route.fulfill({ json: { ok: true, datos: [], total: 0 } });
        if (url.hostname.includes("posthog.com")) {
          const kind = classifyPosthogRequest(url.pathname);
          counts[kind]++;
          if (kind === "unknown") unknownPaths.push(url.pathname);
          if (kind === "flags") return route.fulfill({ status: 200, json: { featureFlags: {}, flags: {} } });
          if (kind === "config") return route.fulfill({ status: 200, json: {} });
          if (kind === "capture") {
            const decoded = decodeCaptureBody(request);
            if (decoded) capturedEvents.push(decoded);
          }
          return route.fulfill({ status: 200, json: {} });
        }
        if (url.origin !== new URL(baseURL).origin || (!url.pathname.startsWith("/_next/")
          && !["/", "/privacidad", "/como-funciona", "/favicon.ico"].includes(url.pathname))) {
          blocked.push(url.origin + url.pathname);
          return route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
        }
        return route.continue();
      });

      function assertNoAnalyticsTraffic(label) {
        assert.equal(counts.flags, 0, `no flags request ${label}`);
        assert.equal(counts.config, 0, `no remote-config request ${label}`);
        assert.equal(counts.capture, 0, `no capture request ${label}`);
        assert.equal(counts.unknown, 0, `no unrecognized PostHog request ${label} (saw: ${unknownPaths.join(", ")})`);
      }

      // 1. Before choosing: nothing at all, of any kind.
      await page.goto(`${baseURL}/privacidad?private_test=should_not_send`);
      await page.getByRole("status").filter({ hasText: "sin elegir" }).waitFor();
      await page.waitForTimeout(1200);
      assertNoAnalyticsTraffic("before choosing");
      assert.equal((await context.cookies()).some((cookie) => cookie.name.startsWith("ph_")), false);

      // 2. Reject: still nothing.
      await page.getByRole("button", { name: "Rechazar analítica" }).click();
      await page.getByRole("status").filter({ hasText: "rechazada" }).waitFor();
      await page.waitForTimeout(800);
      assertNoAnalyticsTraffic("after rejecting");

      // 3. Accept: an explicit, decodable $pageview must reach a known
      // capture endpoint (simulated here -- this is NOT evidence of
      // ingestion by the real PostHog project, only that posthog-js
      // attempted delivery and this test harness received the content).
      await page.getByRole("button", { name: "Aceptar analítica" }).click();
      await page.getByRole("status").filter({ hasText: "aceptada" }).waitFor();
      for (let i = 0; i < 40 && counts.capture === 0; i++) await page.waitForTimeout(100);
      assert(
        counts.capture > 0,
        `SDK must send an explicit event to a known capture endpoint after acceptance (not just /flags). Errors: ${browserErrors.join("; ")}; unrecognized posthog paths: ${unknownPaths.join(", ")}; blocked: ${blocked.join("; ")}`
      );
      assert.equal(counts.unknown, 0, `no unrecognized PostHog request after accepting (saw: ${unknownPaths.join(", ")})`);
      assert(capturedEvents.length > 0, "the capture endpoint must have received a decodable event body, not an empty/opaque request");
      assert(hasPageviewEvent(capturedEvents), `captured event payload did not contain a $pageview event: ${JSON.stringify(capturedEvents).slice(0, 500)}`);
      assertNoSensitiveLeak(capturedEvents);

      // 4. Reload after accepting: the choice must persist (still
      // "aceptada", no re-click needed) and the SDK must re-initialize and
      // send a fresh $pageview to the simulated capture endpoint again.
      // capturedEvents already holds the pre-reload $opt_in/$pageview, so
      // the $pageview check below must only look at events captured AFTER
      // this point -- searching the full history could pass by matching the
      // earlier event even if reload sent nothing new.
      const captureCountBeforeReload = counts.capture;
      const capturedEventsCountBeforeReload = capturedEvents.length;
      await page.reload();
      await page.getByRole("status").filter({ hasText: "aceptada" }).waitFor();
      for (let i = 0; i < 40 && counts.capture === captureCountBeforeReload; i++) await page.waitForTimeout(100);
      assert(counts.capture > captureCountBeforeReload, "accepted consent must persist across reload and resume sending (new $pageview expected)");
      assert.equal(counts.unknown, 0, `no unrecognized PostHog request after reload (saw: ${unknownPaths.join(", ")})`);
      const eventsAfterReload = capturedEvents.slice(capturedEventsCountBeforeReload);
      assert(eventsAfterReload.length > 0, "no new decodable capture event after reload, only the pre-reload one(s)");
      assert(hasPageviewEvent(eventsAfterReload), `no NEW $pageview event found among events captured after reload: ${JSON.stringify(eventsAfterReload).slice(0, 500)}`);
      assertNoSensitiveLeak(eventsAfterReload);

      // 5. Withdraw (reject again): no further capture/flags/config traffic.
      await page.getByRole("button", { name: "Rechazar analítica" }).click();
      await page.getByRole("status").filter({ hasText: "rechazada" }).waitFor();
      const afterWithdrawal = { ...counts };
      await page.goto(`${baseURL}/como-funciona`);
      await page.getByRole("heading", { name: "Cómo funciona Gasolisto", exact: true }).waitFor();
      await page.waitForTimeout(1600);
      assert.deepEqual(counts, afterWithdrawal, "no new flags/config/capture request after withdrawing consent");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

      // 6. Reload after withdrawing: rejection persists, nothing resumes.
      // The non-banner status text only renders on /privacidad, so land
      // there first.
      await page.goto(`${baseURL}/privacidad`);
      await page.getByRole("status").filter({ hasText: "rechazada" }).waitFor();
      await page.reload();
      await page.getByRole("status").filter({ hasText: "rechazada" }).waitFor();
      await page.waitForTimeout(800);
      assert.deepEqual(counts, afterWithdrawal, "reload must not resume sending after the choice was rejected/withdrawn");
      await page.screenshot({ path: path.join(output, `preferences-${viewport.width}.png`), fullPage: true });

      await page.evaluate(() => {
        localStorage.removeItem("gasolisto_analytics_consent_v1");
        localStorage.setItem("gasolisto_onboarding_visto", "1");
      });
      await page.goto(`${baseURL}/`);
      await page.getByRole("region", { name: "Preferencias de analítica" }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(output, `banner-${viewport.width}.png`) });
      await page.getByRole("button", { name: "Rechazar analítica" }).click();
      await page.getByRole("region", { name: "Preferencias de analítica" }).waitFor({ state: "hidden" });
      assert.deepEqual(counts, afterWithdrawal);
      await context.close();
      console.log(`PASS consent unknown/reject/accept($pageview verified)/reload-resumes/withdraw/reload-stays-withdrawn ${viewport.width}`);
    }
  } finally { await browser.close(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
