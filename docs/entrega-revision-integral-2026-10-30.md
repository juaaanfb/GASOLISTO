# Entrega: revisión integral antes de relanzar (30/10–01/11/2026)

Informe propio de Claude en respuesta a `docs/encargo-claude-revision-integral-2026-10-30.md`. No modifica ni sustituye los documentos de Cerebro Central (`docs/checklist-relanzamiento-2026-10-30.md`, `docs/working-system.md`, `docs/inventario-marca-2026-10-30.md`).

## Estado al cerrar

- Rama: `lote4-revision-integral`, creada desde `lote3-autonomia-viajes` (que ya contenía los commits base 56812ce, 5b63ceb, 33ce0f1, c8eaf29, 000535d y 56ebc4e — verificados presentes, no reescritos).
- 8 commits locales nuevos, uno por hallazgo, cada uno con su propia prueba de verificación antes/después. Ninguno usa `git add` general; cada commit selecciona explícitamente sus archivos.
- `docs/working-system.md` e `docs/impulso-octubre-2026.md` siguen modificados por Cerebro/trabajo previo — no se han tocado ni incluido en ningún commit propio.
- Build de producción y typecheck finales: **PASS** (ver sección de pruebas).

## Matriz de flujos ejecutados

| # | Flujo | Ejecutado | Fallos encontrados | Estado |
|---|---|---|---|---|
| 1 | Primera visita (bienvenida/consentimiento) | Sí, en navegador real (Chromium vía Browser pane) | 2 reproducidos | Corregidos |
| 2 | Ubicación | Sí, en navegador real | 2 reproducidos | Corregidos |
| 3 | Mapa/lista | Sí (manual + `smoke-ui.cjs` automatizado: estados API vacío/error) | 0 (1 comportamiento verificado y descartado como bug) | — |
| 4 | Favoritas, descuentos, vehículo | Sí, en navegador real con fallo de `localStorage` simulado | 1 reproducido (grave) | Corregido |
| 5 | Alertas | Revisión de código + contraste de textos | 1 reproducido (texto engañoso) | Corregido |
| 6 | Viajes | Sí, en navegador real + 18 pruebas deterministas | 1 reproducido (grave, con implicación de seguridad) | Corregido |
| 7 | Enlaces | Sí, en navegador real (404, privacidad, Cómo llegar/Maps) | 0 | — |
| 8 | PWA con service worker activo | Sí, build de producción real, origen aislado, SW confirmado `activated` | 1 reproducido (grave) | Corregido |
| — | Accesibilidad (teclado/foco) | Sí, en los overlays afectados | 1 patrón adicional (BottomSheet) | Corregido |
| — | Visual 375/390/escritorio | Sí (capturas) | 0 | — |
| — | Rendimiento | Solo cualitativo (ver limitaciones) | — | — |

No se ha "agotado" cada sub-caso de cada flujo de forma exhaustiva (ver "Limitaciones y pendientes"); donde no hay evidencia de reproducción, no se afirma que el flujo esté libre de fallos.

## Fallos reproducidos y corregidos

### 1. Modal de bienvenida sin cierre accesible por teclado
**Archivo:** `components/onboarding/WelcomeModal.tsx` · **Commit:** `354352c`
Sin `role="dialog"`, sin manejo de Escape, sin atrapar el foco: Tab se escapaba a un botón de la cabecera oculto tras el overlay, y Escape no cerraba. Reproducido con el DevTools-less path real (Tab/Escape en el navegador), corregido con focus trap + Escape + `aria-modal` + restauración de foco al botón que abrió el modal.
Evidencia: `GASOLISTO-evidencia-2026-10-30/flujo1-bienvenida-consentimiento/`.

### 2. Banner de consentimiento invisible en la pestaña Mapa
**Archivo:** `components/AnalyticsConsent.tsx` · **Commit:** `354352c`
El banner (`z-[110]`) quedaba completamente oculto bajo los paneles internos de Leaflet (`z-index` hasta 700), que no crean su propio contexto de apilamiento. En la pestaña Mapa —la primera que ve cualquier usuario— el aviso de analítica opcional era invisible e inaccesible. Confirmado comparando Mapa (oculto) vs Lista (visible). Corregido subiendo el banner a `z-[1500]` (por debajo de la bienvenida, por encima del planificador de viaje).

### 3. Modal de descuentos: mismo problema de foco/Escape que el modal de bienvenida
**Archivo:** `components/discounts/DescuentosForm.tsx` · **Commit:** `e8ecc15`
Estructura idéntica a WelcomeModal, mismo fallo. Mismo patrón de corrección aplicado y verificado.

### 4. BottomSheet (Lista, detalle, vehículo) no cerraba con Escape
**Archivo:** `components/ui/BottomSheet.tsx` · **Commit:** `5a3077e`
Escape no hacía nada en vistas con overlay ya cerrable por click en el backdrop (p.ej. Lista). Se añadió Escape exactamente en el mismo alcance que ya tenía el backdrop (sin añadir focus trap, que habría sido un cambio de mayor superficie sobre 4 pantallas distintas).

### 5. Pin "tú estás aquí" falso en Madrid mientras la geolocalización está pendiente
**Archivo:** `app/page.tsx` · **Commit:** `5647ad8`
`ubicacionUsuario = esFallback ? null : coordenadas` no contemplaba el estado *pendiente* (antes de que `getCurrentPosition` resuelva): en esa ventana, `coordenadas` ya vale `MADRID_CENTRO` y `esFallback` sigue en `false`, así que el mapa mostraba un pin de ubicación real en Madrid sin que fuera cierto — justo lo que el encargo pide evitar explícitamente. Reproducido con un retardo de prueba temporal en `useGeolocation.ts` (revertido, no forma parte del commit) y confirmado por inspección del DOM (`blueDotPins: 1` con el banner de fallback aún sin mostrarse). Corregido añadiendo `cargandoUbicacion` a la condición.
Evidencia: `GASOLISTO-evidencia-2026-10-30/flujo2-ubicacion/bug-pin-madrid-pendiente.md`.

### 6. El desplegable de búsqueda de ciudad se reabría tras confirmar
**Archivo:** `components/trip/AutocompleteInput.tsx` · **Commit:** `5647ad8`
Confirmar una ciudad con Enter fija `zonaTexto` al label completo resuelto; `AutocompleteInput` no tenía forma de saber que ese cambio de `value` ya estaba confirmado (su marca interna `ultimoSeleccionadoRef` solo cubre selecciones hechas haciendo click en una sugerencia), así que relanzaba la búsqueda por debounce y volvía a abrir el desplegable sobre el mapa — reproducible en cada cambio de ciudad por Enter. Corregido con una prop `valorConfirmado` que el padre puede fijar.
Evidencia: `GASOLISTO-evidencia-2026-10-30/flujo2-ubicacion/` (capturas 02 a 06).

### 7. Un fallo de `localStorage.setItem` rompía toda la aplicación
**Archivos:** `hooks/useFavoritas.ts`, `hooks/useVehiculo.ts`, `hooks/useAlertas.ts` · **Commit:** `3984282`
`useDescuentos` ya protegía su escritura con try/catch; los otros tres hooks no. Con `Storage.prototype.setItem` parcheado para lanzar (simulando cuota llena / modo privado / almacenamiento bloqueado), marcar una favorita rompía el render completo de React (overlay de error de Next.js / pantalla en blanco en producción, sin ErrorBoundary en la app). Corregido aplicando el mismo patrón try/catch ya usado en `useDescuentos`: el cambio se mantiene en memoria para la sesión aunque no se persista.
Evidencia: `GASOLISTO-evidencia-2026-10-30/flujo4-favoritas-descuentos-vehiculo/`.

### 8. Texto de bienvenida prometía avisos en segundo plano inexistentes
**Archivo:** `components/onboarding/WelcomeModal.tsx` · **Commit:** `a2447eb`
"Te avisamos cuando una estación baje" no llevaba la salvedad que SÍ tiene el texto de detalle de cada gasolinera ("...mientras la tengas abierta en el navegador"). No hay service worker push ni backend: las alertas solo se comprueban con la app abierta (efecto sobre `alertasDisparadas` en `app/page.tsx`). Corregido el texto de bienvenida para que coincida con la implementación real; no se ha tocado "Ahorro real" (contrastado contra `calcularAhorro` y la FAQ de `/como-funciona`, ya es preciso).

### 9. El plan de viaje calculado no se invalidaba al cambiar los datos
**Archivo:** `components/trip/TripPlanner.tsx` · **Commit:** `f9e8f49`
`plan`/`error` solo se escribían dentro de `calcular()`; cambiar la autonomía, el destino, el origen, la marca preferida o el vehículo activo DESPUÉS de calcular, sin volver a pulsar "Calcular ruta", dejaba en pantalla el plan antiguo completo (mapa, paradas, coste, y el texto "Con X km de autonomía restante...") como si siguiera vigente para los valores que se ven ahora en el formulario. Implicación de seguridad real: un conductor que revisa su autonomía real tras ver un plan podría seguir mirando paradas calculadas para una autonomía mucho mayor. Reproducido (Madrid→Valencia, 200 km → cambiar a 8 km sin recalcular: el plan de 357 km con parada en Tarancón seguía ahí) y corregido con un `useEffect` que invalida `plan`/`error` al cambiar cualquiera de esos datos.
Evidencia: `GASOLISTO-evidencia-2026-10-30/flujo6-viajes/`.

### 10. Caché del shell del service worker: no fiable y con la clave equivocada
**Archivo:** `public/sw.js` · **Commit:** `89c2c33`
Probado contra un build de producción real (`npm run build && next start`), en un origen aislado, con el service worker genuinamente activo (`navigator.serviceWorker.getRegistrations()` → `active: "activated"`; no se usó `serviceWorkers:block`). Dos fallos en el manejador de navegación:
1. La escritura en caché del shell no estaba dentro de `event.waitUntil()`: el evento podía darse por completado antes de que la escritura terminara. Reproducido: navegar a `/como-funciona` y esperar varios segundos no actualizaba nunca la entrada cacheada de `"/"`.
2. Esa misma escritura guardaba SIEMPRE bajo la clave `"/"`, sin importar qué ruta se navegó — de haber llegado a completarse, habría servido el HTML de `/privacidad` o `/como-funciona` bajo la ruta `"/"` la próxima vez que fallara una navegación sin conexión.
Corregido: solo se escribe el shell cuando `url.pathname === "/"`, y esa escritura va dentro de `event.waitUntil()`. Verificado en un rebuild: tras navegar a `/privacidad`, la entrada cacheada de `"/"` sigue siendo la home.
Evidencia: `GASOLISTO-evidencia-2026-10-30/flujo8-pwa/bug-sw-shell-cache.md`.

## Comportamientos verificados y descartados como bug

- **"Ahorro real" usa el combustible del vehículo activo, no el filtro de combustible seleccionado en la pestaña Mapa/Lista.** Confirmado como diseño intencional y consistente: `calcularAhorro` (usado igual en `StationDetail` y `StationCard`) siempre calcula sobre `vehiculo.combustible`. No se ha tocado.
- **Página 404** (`app/not-found.tsx`): devuelve HTTP 404 real (confirmado por red), contenido correcto, enlace de vuelta funcional.
- **Enlaces "Cómo llegar" / Google Maps / Apple Maps** (`StationDetail.tsx`, `TripPlanner.tsx`): `target="_blank" rel="noopener noreferrer"`, URLs construidas solo con coordenadas, sin envío de formularios ni datos a terceros.
- **`VehicleForm`**: valida consumo/depósito ≤ 0, pero no hay límite superior aplicado en `validar()` (los atributos `min`/`max` del `<input type="number">` son solo UI). Es una entrada de texto libre para el propio vehículo del usuario; no provoca crash ni pérdida de datos, solo permite valores poco realistas. Se documenta como observación de baja severidad, no se ha corregido (fuera de prioridad: no es un bloqueante ni pérdida de preferencias).

## Pruebas ejecutadas

Todas desde `C:\Users\mfbag\OneDrive\Escritorio\Juan\GASOLISTO`, con el entorno aislado de Playwright ya instalado en `C:\Users\mfbag\AppData\Local\Temp\claude\gasolisto-playwright-env` (Chromium; no se ha instalado ninguna versión nueva).

```bash
npx tsc --noEmit                      # PASS (ejecutado tras cada cambio)
npm run build                         # PASS (build final, ver nota OneDrive abajo)
npx tsx scripts/test-autonomia.ts     # 18 pasadas, 0 fallidas

export PLAYWRIGHT_MODULE_PATH=/c/Users/mfbag/AppData/Local/Temp/claude/gasolisto-playwright-env/node_modules/playwright
export SMOKE_URL=http://localhost:3000
node scripts/smoke-ui.cjs             # PASS (6 escenarios: 390/1280px, GPS, errores de API)
node scripts/smoke-consent.cjs        # PASS (requiere NEXT_PUBLIC_POSTHOG_KEY, ver nota abajo)
node scripts/smoke-seo.cjs            # PASS (FAQ, sitemap, robots)
```

**Nota — `.env.local` para `smoke-consent.cjs`:** este checkout no tenía ningún `NEXT_PUBLIC_POSTHOG_KEY` configurado (ni archivo `.env*` ni variable de entorno), así que `posthog.init()` nunca se llamaba y la prueba fallaba por esa razón — no por un fallo del producto. Se creó un `.env.local` local (gitignorado, `.env*.local` ya está en `.gitignore`, no se ha tocado ni commiteado nada) con una clave de prueba claramente falsa (`phc_test_local_smoke_only_not_real`) solo para poder ejercitar el camino de código consentimiento→captura; `smoke-consent.cjs` intercepta y simula TODAS las peticiones a `posthog.com` vía `page.route()`, así que en ningún momento se ha enviado tráfico al proyecto PostHog real 250159. El archivo sigue en el checkout (no committeado) para quien quiera repetir la prueba sin tener que averiguar este requisito primero.

**Nota — build en carpeta OneDrive:** con el servidor `next dev` corriendo a la vez, `npm run build` falla con `EINVAL: invalid argument, readlink ... interception-route-rewrite-manifest.js` (conflicto de symlink en la carpeta sincronizada con OneDrive). Solución ya usada en fases previas de este proyecto: build con `NEXT_BUILD_DIR` a una carpeta alternativa, que Next.js usa para reescribir temporalmente `include` en `tsconfig.json`; se restauró `tsconfig.json` a su contenido exacto de HEAD después (`git diff --stat -- tsconfig.json` vacío) y se borró la carpeta de build alternativa.

### PWA (service worker activo)
Build de producción real, servido con `next start` en un puerto distinto (origen aislado, nunca usado por el servidor de desarrollo), sin `serviceWorkers:block`:
- `navigator.serviceWorker.getRegistrations()` → `active: "activated"` confirmado tras la primera carga.
- Caché `gasolisto-v1-static` contiene solo assets de `/_next/static/` con hash (cache-first correcto); **ninguna** entrada de `/api/`, confirmando que los precios nunca se sirven cacheados ni se muestran como "nuevos" si están caducados.
- Caché `gasolisto-v1-shell` contiene solo la clave `"/"`, y tras navegar a `/privacidad` sigue mostrando el título de la home (fix del hallazgo #10 verificado).
- No se ha podido probar la desconexión real (no hay control de "offline" expuesto en las herramientas de este entorno); la verificación de desconexión/recuperación se apoya en inspección directa de las Cache API, no en una prueba de red real desconectada.

## Accesibilidad, visual

- **Foco visible y teclado**: verificado en WelcomeModal, DescuentosForm y BottomSheet/Lista (Tab, Shift+Tab, Escape) tras las correcciones. No se ha revisado exhaustivamente el foco dentro de StationDetail, VehicleSelector ni VehicleForm (contenido de BottomSheet con `onClose` indefinido en esos casos — fuera del alcance de la corrección de Escape aplicada).
- **375px / 390px / escritorio**: capturas tomadas para bienvenida, banner de consentimiento, lista y detalle de estación; sin solapamientos visibles en ninguno.
- **Zoom del navegador**: no se ha probado explícitamente (p.ej. 150%/200%).
- **Motor real**: todas las pruebas de esta entrega usaron Chromium (vía el Browser pane de Claude Code). No se ha repetido WebKit en esta entrega — las pruebas de WebKit para marcadores de precio de la entrega anterior (`docs/entrega-autonomia-iphone-2026-10-29.md`) siguen siendo la última evidencia con ese motor, y siguen sin equivaler a un iPhone físico.

## Rendimiento

Medido de forma cualitativa únicamente: todas las interacciones probadas en esta sesión (cambio de filtro de combustible, cambio de radio, apertura de detalle, cambio de ciudad) respondieron sin demora perceptible en el servidor de desarrollo local (`npm run dev`, Chromium vía Browser pane, esta máquina). No se han tomado métricas de temporización reproducibles por falta de una condición de red/CPU controlada y documentada de forma fiable con las herramientas disponibles en este entorno — por tanto no se reportan cifras, para no inventar un umbral o una métrica de usuario real. Dato objetivo disponible: `performance.getEntriesByType('navigation')` en una carga típica del servidor de desarrollo dio `domContentLoaded ≈ 159ms`, `load ≈ 813ms` (modo desarrollo, no representativo de producción).

No se ha revisado ni modificado el stack de dependencias ni se ha intentado ninguna migración: no había ningún fallo concreto de rendimiento dentro del alcance que lo justificara.

## Archivos y commits de esta entrega

| Commit | Archivos | Hallazgo |
|---|---|---|
| `354352c` | `components/onboarding/WelcomeModal.tsx`, `components/AnalyticsConsent.tsx` | #1, #2 |
| `5647ad8` | `app/page.tsx`, `components/trip/AutocompleteInput.tsx` | #5, #6 |
| `3984282` | `hooks/useFavoritas.ts`, `hooks/useVehiculo.ts`, `hooks/useAlertas.ts` | #7 |
| `e8ecc15` | `components/discounts/DescuentosForm.tsx` | #3 |
| `a2447eb` | `components/onboarding/WelcomeModal.tsx` | #8 |
| `f9e8f49` | `components/trip/TripPlanner.tsx` | #9 |
| `89c2c33` | `public/sw.js` | #10 |
| `5a3077e` | `components/ui/BottomSheet.tsx` | #4 |

## Limitaciones y pendientes

No se declara "todo perfecto". Explícitamente **no comprobado** o **no exhaustivo** en esta entrega:
- Flujo 3 (datos MITECO lentos/reintentos) solo cubierto por el código ya existente + los casos vacío/error de `smoke-ui.cjs`; no se ha forzado una respuesta lenta real.
- Flujo 4: descuentos no probados con entradas límite en vivo (código revisado, protegido por try/catch); vehículo no probado con JSON corrupto en `localStorage` en vivo (lectura ya protegida por try/catch desde antes).
- Flujo 6: no se ha repetido en el navegador cada sub-caso individual de la lista del encargo (depósito lleno, origen sin GPS, proveedor lento/error, cada combinación de marca preferida); esos casos están cubiertos a nivel de lógica por las 18 pruebas deterministas, no verificados uno a uno en la UI real en esta ronda.
- Accesibilidad: sin revisión de foco dentro de StationDetail/VehicleSelector/VehicleForm; sin prueba de zoom del navegador; sin repetición en WebKit.
- PWA: sin prueba de desconexión de red real (herramienta no disponible en este entorno); verificación basada en inspección directa de Cache API.
- Rendimiento: sin medición bajo condiciones de red/CPU restringidas ni comparación formal antes/después (no hubo corrección de rendimiento que lo requiriera).
- No se ha comprobado iPhone físico (ya documentado como pendiente en la entrega anterior).
- No se ha tocado nada de marca, dominio, ni la documentación de Cerebro.

## Siguientes mejoras propuestas (no implementadas en este encargo)

- Añadir `role="dialog"`/focus trap a `StationDetail`, `VehicleSelector` y `VehicleForm` (actualmente solo BottomSheet gana Escape cuando `onClose` está definido, que no es el caso de esas tres pantallas).
- Añadir validación de límite superior en `VehicleForm` (consumo/depósito) coherente con los atributos `min`/`max` ya presentes en los inputs.
- Automatizar una prueba de service worker con desconexión real (hoy requeriría una herramienta de red distinta a las disponibles en este entorno).

Entrega para revisión de Cerebro Central. Me detengo aquí.
