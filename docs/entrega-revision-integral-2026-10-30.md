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
- PWA: ver adenda del 01/11/2026 — se consiguió una prueba de desconexión real (parando el propio servidor, no por inspección de caché).
- Rendimiento: sin medición bajo condiciones de red/CPU restringidas ni comparación formal antes/después (no hubo corrección de rendimiento que lo requiriera).
- No se ha comprobado iPhone físico (ya documentado como pendiente en la entrega anterior).
- No se ha tocado nada de marca, dominio, ni la documentación de Cerebro.

## Siguientes mejoras propuestas (no implementadas en este encargo)

- Añadir `role="dialog"`/focus trap a `StationDetail`, `VehicleSelector` y `VehicleForm` (actualmente solo BottomSheet gana Escape cuando `onClose` está definido, que no es el caso de esas tres pantallas).
- Añadir validación de límite superior en `VehicleForm` (consumo/depósito) coherente con los atributos `min`/`max` ya presentes en los inputs.

---

## Adenda (01/11/2026): cierre de pendientes señalados por Cerebro Central

Cerebro Central revisó la entrega anterior y pidió cerrar 5 puntos concretos, sin implementar ninguna otra mejora opcional. Esta adenda los cubre uno a uno. Rama y commits nuevos sobre los mismos `lote4-revision-integral`, sin reescribir ninguno de los 8 commits anteriores.

### 1. Viajes: resultados obsoletos — CORREGIDO (y verificado que el fallo era real)

El `useEffect` de invalidación ya limpiaba `plan`/`error` al cambiar un parámetro, pero no impedía que `calcular()` — ya en vuelo con los parámetros ANTERIORES — publicara su resultado al resolver más tarde. Se añadió `vigenteRef` (contador de versión): se incrementa en el mismo efecto de invalidación (ahora también con `combustible` y `coordenadas` —origen GPS— entre sus dependencias, que antes faltaban) y `calcular()` captura una instantánea (`miVersion`) al empezar; tanto el `setPlan(resultado)` de éxito como el `setError(...)` de fallo se descartan si la versión ya cambió al resolver. `calculandoRef`/`setCargando(false)` siguen ejecutándose siempre en el `finally`, para no bloquear cálculos nuevos.

**Prueba determinista añadida:** `scripts/smoke-race-conditions.cjs` (escenario "Viajes"). Retiene la respuesta de OSRM con una promesa controlada por el test, cambia la autonomía de 200 a 5 km mientras la petición sigue en vuelo, libera la respuesta retrasada y comprueba que el plan de 200 km nunca aparece, que no queda ningún bloque de resultados en pantalla, y que el formulario sigue operativo. **Verificado que el test falla sin la corrección** (revertida temporalmente, restaurada después: `git diff` vacío tras la verificación).

Archivos: `components/trip/TripPlanner.tsx`, `scripts/smoke-race-conditions.cjs`.

### 2. Almacenamiento: lectura y estructura — CORREGIDO

- `cargarActivoId()` en `useVehiculo.ts` no tenía try/catch (a diferencia de `cargarVehiculos()`); corregido.
- Se añadió validación de estructura antes de usar cualquier dato recuperado de `localStorage`, en los cuatro hooks:
  - `useVehiculo.ts`: `JSON.parse` debe dar un array; cada elemento se valida contra la forma real de `Vehiculo` (id/nombre string, combustible en `COMBUSTIBLES`, consumo/depósito numéricos finitos) con `esVehiculoValido()`. Las entradas inválidas se descartan SOLO para esta sesión; si no queda ninguna válida, se usa `VEHICULO_DEFAULT` en memoria.
  - `useFavoritas.ts`: debe ser un array de strings; si no, se ignora.
  - `useAlertas.ts`: cada alerta se valida con `esAlertaValida()` (gasolineraId string, combustible conocido, umbral numérico finito); lecturas de `alertas` y `resumenDiario` en try/catch separados para que un fallo en una clave no tape la otra.
  - `useDescuentos.ts`: debe ser un objeto plano (no array); se conservan solo las claves cuya marca es conocida (`MARCAS`) y cuyo valor es un número finito.
- **Ninguno de los cuatro hooks borra ni reescribe el valor original en `localStorage`** al encontrarlo inválido — la limpieza es solo en memoria, para esta sesión. Esto es una limitación de persistencia deliberada y documentada aquí: si el dato guardado tiene forma inesperada, se pierde para esa sesión (se usa un valor por defecto o se descarta esa entrada) pero el original permanece en el dispositivo por si una versión futura puede interpretarlo.

**Verificación:** typecheck PASS; prueba manual en el navegador (marcar favorita, guardar vehículo, recargar) confirma que datos VÁLIDOS se siguen leyendo y mostrando con normalidad tras el cambio (no se trata de una regresión silenciosa). No se ha construido una prueba automatizada específica de "JSON corrupto" (queda como pendiente, ver abajo) — la validación se revisó manualmente leyendo el código y probando el camino feliz.

Archivos: `hooks/useVehiculo.ts`, `hooks/useFavoritas.ts`, `hooks/useAlertas.ts`, `hooks/useDescuentos.ts`.

### 3. Autocompletado: respuestas tardías/fuera de orden — CORREGIDO

`clearTimeout()` solo cancela un debounce que todavía no ha lanzado la petición; una vez en vuelo, no hay forma de cancelarla, y su respuesta podía llegar después de confirmar, seleccionar, limpiar o seguir escribiendo, reabriendo el desplegable con resultados de una consulta ya abandonada. Se añadió `busquedaIdRef` (mismo patrón que en el punto 1): se incrementa en `buscar()` (en cada tecleo, antes de entrar en el debounce), en `seleccionar()`, en el manejador de Enter, y en los dos casos en los que el efecto salta la búsqueda (valor ya seleccionado o ya confirmado por quien usa el input). Solo se aplica un resultado si su id sigue siendo el vigente cuando la petición resuelve.

**Pruebas deterministas añadidas:** `scripts/smoke-race-conditions.cjs`, dos escenarios: "cambiar la consulta" (se escribe "Mad", se retiene su respuesta, se cambia a "Valencia" mientras sigue en vuelo, se confirma que el desplegable muestra Valencia y nunca el resultado tardío de "Mad") y "limpiar" (mismo retraso, pero el campo se vacía en vez de cambiar de consulta). **Verificado que ambos fallan sin la corrección** (revertida temporalmente, restaurada después).

No se ha añadido un escenario dedicado para "confirmar"/"seleccionar": ambos pasan por el mismo `busquedaIdRef` y por el mismo mecanismo ya cubierto por los dos escenarios anteriores; se consideró cobertura suficiente dado el alcance de "pruebas focalizadas" pedido.

Archivos: `components/trip/AutocompleteInput.tsx`, `scripts/smoke-race-conditions.cjs`.

### 4. PWA: desconexión y recuperación — CORREGIDO (fallback del service worker) y PROBADO con desconexión real

**Hallazgo adicional durante esta verificación:** el `catch(() => caches.match("/"))` del manejador de navegación se aplicaba a CUALQUIER ruta, no solo a `"/"`. Si la red fallaba al navegar a `/privacidad` o `/como-funciona`, el service worker habría servido el HTML de la home bajo esa URL — contenido equivocado presentado como la página pedida, exactamente lo que se pidió evitar. Corregido: el fallback al shell cacheado solo se aplica cuando `url.pathname === "/"`; para el resto de rutas, si la red falla, se deja que el navegador muestre su propia pantalla de sin conexión (honesto) en vez de sustituir el contenido.

**Sobre la herramienta de prueba (documentado con detalle porque es relevante para quien repita esto):** se intentó `context.setOffline()` de Playwright; no bloqueó el `fetch()` que el propio service worker hace al manejar una navegación (confirmado con `response.fromServiceWorker() === true` y cabeceras reales del servidor en la respuesta recibida "sin conexión"). Se probó también abortar todas las peticiones con `page.route("**/*", route => route.abort())`: mismo resultado. Se probó enviar `Network.emulateNetworkConditions({offline:true})` directamente a la sesión CDP del propio service worker (vía `Target.attachToTarget`): mismo resultado. Las tres vías fallan en este entorno/versión de Playwright (1.49.1) para peticiones que el service worker origina desde su propio hilo — es una limitación confirmada de la herramienta, no un comportamiento del producto.

Para conseguir una desconexión **genuinamente real** (no emulada), la prueba final controla su propio proceso `next start` y lo **para de verdad** (ECONNREFUSED real) en vez de emular la red:
1. Arranca el servidor de producción, confirma el service worker `activated`.
2. Para el proceso del servidor.
3. Navega a `"/"` → se recupera del shell cacheado, título correcto. **PASS.**
4. Navega a `/privacidad` (nunca visitada online antes, para no contaminar el resultado con la caché HTTP del navegador) → la navegación **falla honestamente** (`net::ERR_FAILED`), nunca se muestra el contenido de la home bajo esa URL. **PASS.**
5. Reinicia el servidor → `/privacidad` recupera su contenido real. **PASS.**

**Verificado que el test falla sin la corrección** (revertido temporalmente el fallback para todas las rutas, restaurado después: `git diff` vacío).

Archivos: `public/sw.js`, `scripts/smoke-pwa-offline.cjs` (incluye instrucciones de reproducción en su cabecera).

### 5. Entorno de pruebas: `.env.local` sintético — DOCUMENTADO Y ELIMINADO

Este checkout no tenía ningún `NEXT_PUBLIC_POSTHOG_KEY` configurado, así que `scripts/smoke-consent.cjs` no podía ejercitar el camino de consentimiento→captura (`posthog.init()` nunca se llamaba). Se creó temporalmente un `.env.local` (gitignorado por el `.env*.local` ya existente en `.gitignore`; nunca se tocó ningún archivo ajeno) con `NEXT_PUBLIC_POSTHOG_KEY=phc_test_local_smoke_only_not_real` — un valor sin ambigüedad posible con una clave real, usado solo porque `smoke-consent.cjs` intercepta y simula el 100% de las peticiones a `posthog.com` con `page.route()` (nunca llegó tráfico al proyecto real 250159).

**Para que esto no quede como configuración normal reutilizable en un futuro build de publicación, el archivo se ha eliminado** al terminar de usarlo (confirmado: `ls .env*` no devuelve nada en este checkout). Quien quiera repetir `smoke-consent.cjs` debe recrearlo expresamente:
```bash
echo "NEXT_PUBLIC_POSTHOG_KEY=phc_test_local_smoke_only_not_real" > .env.local
# ... ejecutar smoke-consent.cjs ...
rm .env.local   # o sustituirlo por la clave real antes de cualquier build de publicación
```

### Suite final ejecutada tras los 4 puntos anteriores

```bash
npx tsc --noEmit                              # PASS
npm run build                                 # PASS (build de verificación final, con el workaround de NEXT_BUILD_DIR documentado en la entrega original; tsconfig.json restaurado, git diff vacío)
npx tsx scripts/test-autonomia.ts             # 18 pasadas, 0 fallidas (sin cambios en lib/routing.ts esta ronda)
node scripts/smoke-ui.cjs                     # PASS (6 escenarios)
node scripts/smoke-consent.cjs                # PASS (con el .env.local temporal descrito arriba)
node scripts/smoke-seo.cjs                    # PASS
node scripts/smoke-race-conditions.cjs        # PASS (3 escenarios nuevos: viaje obsoleto, autocompletado cambiar/limpiar)
node scripts/smoke-pwa-offline.cjs            # PASS (servidor real parado/reiniciado; ver punto 4)
```

### Diferenciación comprobado / corregido / pendiente de esta adenda

**Corregido y verificado con prueba automatizada que falla sin el fix:**
- #1 Viajes: resultado obsoleto tras cambiar parámetros durante el cálculo.
- #3 Autocompletado: respuesta tardía/fuera de orden reabriendo el desplegable (2 escenarios).
- #4 PWA: fallback del shell sirviendo contenido equivocado bajo otra ruta.

**Corregido y verificado manualmente (sin prueba automatizada dedicada):**
- #2 Validación de estructura en los 4 hooks de almacenamiento; `cargarActivoId` protegido.

**Comprobado con una limitación de herramienta documentada, no sustituida por inspección de caché:**
- #4 La desconexión real se consiguió parando el servidor controlado por el propio script, no mediante emulación de red (`context.setOffline`, `page.route` abort y CDP `Network.emulateNetworkConditions` sobre la sesión del service worker se probaron los tres y ninguno bloquea el fetch del propio SW en este entorno — limitación documentada, no un pendiente oculto).

**Pendiente, explícitamente no implementado en esta adenda:**
- Prueba automatizada específica de JSON corrupto/con forma inesperada en `localStorage` para los 4 hooks (la validación se verificó manualmente y por lectura de código, no con un test dedicado).
- Todo lo ya listado como pendiente en la entrega original del 30/10 que esta adenda no cubre (foco en StationDetail/VehicleSelector/VehicleForm, zoom del navegador, WebKit, iPhone físico, validación de límite superior en VehicleForm, rendimiento bajo condiciones controladas).

No se ha implementado ninguna mejora opcional fuera de estos 5 puntos, conforme a lo pedido.

Entrega para revisión de Cerebro Central. Me detengo aquí.
