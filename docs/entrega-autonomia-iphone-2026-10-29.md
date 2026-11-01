# Entrega: autonomía restante en Viajes + legibilidad de precios en iPhone

Fecha: 29-30/10/2026, Europe/Madrid. Trabajo autónomo nocturno sobre el encargo
`docs/encargo-claude-auditoria-relanzamiento-2026-10-28.md` (prioridades 1 y 2),
con Juan ausente. Nada publicado: Vercel sigue pausado, no se ha hecho push,
merge ni deploy, no se ha tocado la marca ni dominios.

**Actualizado el 30/10/2026** con una corrección adicional (commit `56ebc4e`)
tras la revisión de Cerebro Central sobre `c8eaf29`/`lib/routing.ts`. Esta
versión del informe documenta el estado final de ambos commits de autonomía
juntos; la sección 0 resume qué cambió en la corrección y qué limitaciones
de la entrega anterior quedan resueltas.

---

## 0. Corrección tras revisión de Cerebro Central (30/10/2026)

Cerebro Central revisó `c8eaf29` y encontró 5 problemas reales en
`lib/routing.ts`, corregidos en el commit nuevo `56ebc4e` (no se reescribió
el historial):

1. **Balance de combustible** — antes: repostaje fijo al 75% del depósito
   sin mirar cuánto quedaba al llegar (podía, en teoría, superar la
   capacidad real). Ahora `calcularBalanceCombustible()` calcula el
   combustible restante al llegar a cada candidata, limita lo repostado a
   la capacidad libre real, y el resultado es "lo que quedaba + lo
   repostado" — nunca reiniciado. **Resuelto.**
2. **Selección económica** — antes: se aceptaba la primera candidata
   alcanzable en el orden de preselección en línea recta. Ahora se
   verifican hasta 3 candidatas por carretera y se compara su coste neto
   REAL entre todas las alcanzables; se elige la mejor, descrita como
   "mejor opción entre las comprobadas", nunca "óptima". **Resuelto.**
3. **Ida y reincorporación** — antes: la vuelta se asumía igual a la ida
   (limitación que yo mismo había dejado documentada). Ahora
   `obtenerIdaVueltaConTimeout()` verifica ambos sentidos reales en una
   sola petición OSRM de 3 puntos; si falla, ni la ida ni la vuelta se
   usan como dato confirmado. **Resuelto.**
4. **Plan completo** — antes: alcanzar el máximo de paradas sin llegar al
   destino devolvía un plan con un aviso, no un error. Ahora lanza
   `LIMITE_PARADAS_SIN_LLEGAR`, distinto de `SIN_PARADA_VERIFICADA`,
   `FALLO_VERIFICACION_PROVEEDOR` y `LIMITE_PETICIONES_AGOTADO`. **Resuelto.**
5. **Coste y ahorro** — antes: un "ahorro" basado en precio máximo menos
   media, sin relación con las paradas reales del plan. Ahora tres cifras
   distintas y explicadas: `costeCombustibleEstimado`, `importeRepostajes`,
   `ahorroEstimadoParadas`. **Resuelto.**

Además, de oficio: `acumularKmRuta()` ahora reescala la distancia
acumulada de la geometría para que coincida con la distancia total que
declara OSRM, con aviso si la diferencia es notable — para no mezclar dos
escalas de una forma que pudiera subestimar el combustible necesario.

6 pruebas nuevas (10-15), **verificadas por separado contra el código del
commit anterior (`c8eaf29`) antes de dar la corrección por buena: las 6
fallan ahí y pasan con la corrección** (ver sección 5). La prueba 7 se
ajustó: ya no exige el mismo repostaje en cada parada (el balance real
varía parada a parada a propósito, eso es justo lo que se corrigió).

Verificado además con datos reales (no solo mocks): un cálculo real
Madrid→Valencia con 150 km de autonomía y el vehículo por defecto
(50L/6.5L·100km) dio 373 km de distancia, 1 parada en Tarancón (km 100,
desvío real ≈9.5 km verificado por carretera), 34.7 L a repostar
(37.5L objetivo del 75% del depósito − 2.8L que quedaban al llegar) y
577 km de autonomía tras repostar (37.5L/6.5L·100km) — balance exacto,
confirmado en el navegador contra OSRM y MITECO reales.

---

## 1. Qué se ha implementado

### Prioridad 1 — Autonomía restante en Viajes

- Campo "Autonomía restante" (km) en el formulario de Viajes, vacío por
  defecto. Nunca se precarga con la autonomía máxima del vehículo.
- Botón explícito "Uso el depósito lleno" que rellena el campo con la
  autonomía máxima calculada del vehículo activo — una acción del usuario,
  no un valor por defecto.
- Validación antes de calcular, sin llamar a ningún servicio si falla:
  vacío, no numérico, negativo y **cero** (mensaje específico: "con 0 km de
  autonomía no puedes iniciar el viaje, reposta antes de salir" — nunca se
  intenta buscar una parada lejana).
- Aviso (no bloqueante) si la autonomía introducida supera en más de un 10%
  la autonomía máxima calculada del vehículo (depósito/consumo), por si el
  dato está equivocado — no se bloquea, puede ser un depósito real mayor que
  el registrado.
- `lib/routing.ts` reescrito: cada tramo usa la autonomía realmente
  disponible (la indicada por el usuario para el primer tramo; la resultante
  del balance real de combustible — lo que quedaba al llegar más lo
  repostado, limitado a la capacidad libre del depósito — menos la
  reincorporación real verificada a la ruta, para los siguientes). Nunca se
  "reinicia" a la autonomía máxima del vehículo ni se asume simétrico el
  regreso respecto a la ida.
- Candidatas a parada preseleccionadas en línea recta (barato, sin red) pero
  **solo aceptadas tras verificar la distancia real de ida Y vuelta por
  carretera** (OSRM, una sola petición de 3 puntos por candidata). Se
  verifican hasta 3 candidatas por tramo y se compara su coste neto REAL
  entre todas las que resulten alcanzables — se elige la mejor, nunca la
  primera que lo sea. Si la verificación de una candidata falla, ni su ida
  ni su vuelta se usan como dato confirmado: se descarta entera.
- Orden de candidatas por **ahorro neto estimado** (precio frente al precio
  de referencia del combustible en los datos actuales, menos el coste de
  combustible del propio desvío real de ida y vuelta) — no por precio
  aislado, y la cifra final usa datos verificados por carretera, no la
  preselección en línea recta.
- Estados cubiertos, cada uno con su propio mensaje: ninguna candidata en
  línea recta (`SIN_PARADA_ALCANZABLE` / `_MARCA`), candidatas verificadas
  pero ninguna alcanzable (`SIN_PARADA_VERIFICADA`), fallo del proveedor al
  verificar (`FALLO_VERIFICACION_PROVEEDOR`), presupuesto de verificaciones
  agotado (`LIMITE_PETICIONES_AGOTADO`), máximo de paradas alcanzado sin
  llegar al destino (`LIMITE_PARADAS_SIN_LLEGAR` — nunca se devuelve un
  plan de aspecto normal en este caso), autonomía inválida, fallo de
  ruta/API.
- Peticiones de ruta acotadas: máximo 3 candidatas verificadas por carretera
  por cada tramo que necesita parada (1 petición por candidata, ida+vuelta
  juntas), máximo 12 verificaciones en todo el plan, cada una con su propio
  `AbortController`/timeout de 8s. Probado con 27 candidatas disponibles en
  un mismo tramo sin disparar más de 7 peticiones en total para un plan de
  2 paradas.
- Límite de "ruta demasiado corta" bajado de 50 km a 1 km: una ruta corta
  con autonomía baja ya no se descarta sin más, se evalúa igual que
  cualquier otra.
- La geometría de la ruta se reescala para coincidir exactamente con la
  distancia total que declara OSRM (nunca se mezclan dos escalas de forma
  que pudiera subestimar el combustible necesario), con aviso si el ajuste
  es notable.
- Resultados: "combustible del trayecto" (coste de todo el recorrido,
  incluidos los desvíos, al precio de referencia), "importe a repostar en
  las paradas" y "ahorro frente a la referencia" como tres cifras
  distintas y explicadas (nunca solapadas), aviso del margen de reserva del
  15% y del supuesto de repostaje (75% del depósito, nunca más de lo que
  cabe, a partir de lo que quede al llegar), avisos propios del plan si los
  hay, y por cada parada: desvío real verificado, ahorro neto (o "parada
  necesaria: el desvío no compensa frente a la referencia" si no es
  positivo — nunca se llama "ahorro real" a una estimación ni "óptima" a la
  elección, sino "mejor opción entre las comprobadas") y autonomía estimada
  tras repostar.

### Prioridad 2 — Legibilidad de precios en iPhone

- `crearIconoPrecio()` en `components/map/MapView.tsx` ahora declara
  `iconSize`/`iconAnchor` explícitos (era el único marcador del proyecto sin
  ellos; Leaflet le aplicaba 12×12px por defecto, insuficiente para el
  texto del precio).
- Se añadió `-webkit-text-size-adjust: 100%` / `text-size-adjust: 100%` como
  mitigación adicional del autoajuste de tamaño de texto propio de
  WebKit/Safari en bloques estrechos — el mecanismo más plausible para que
  el efecto fuera más visible específicamente en iPhone.
- No se ha rediseñado el mapa ni tocado el resto de marcadores (que ya
  tenían `iconSize` correcto).

## 2. Qué NO se ha implementado (fuera de alcance deliberadamente)

- Optimización multiparada avanzada (recalcular el conjunto completo de
  paradas de forma conjunta en vez de tramo a tramo): la heurística
  tramo-a-tramo con verificación por carretera es la que se entrega,
  explicada y comprobada, como pide el encargo cuando una optimización
  completa excede el alcance razonable.
- Ninguna cuenta, servicio de pago ni integración nueva.
- Ningún cambio de marca, dominio, ni reactivación de Vercel.
- No se ha reproducido el caso real de la amiga de Juan en un iPhone físico
  (ver limitaciones).

## 3. Decisiones y supuestos del cálculo (todas conservadoras y documentadas en el propio código)

| Decisión | Valor | Dónde |
|---|---|---|
| Margen de reserva | 15% de la autonomía disponible no se cuenta como alcanzable | `MARGEN_RESERVA = 0.85` |
| Objetivo de repostaje al parar | hasta el 75% del depósito, limitado a la capacidad libre real (combustible restante + repostado) | `FRACCION_REPOSTAJE_OBJETIVO`, `calcularBalanceCombustible()` |
| Radio de preselección en línea recta | 10 km (igual que el resto de la app) | `RADIO_BUSQUEDA_KM` |
| Candidatas verificadas por carretera por tramo | máx. 3; se compara el coste neto real entre todas las alcanzables, no se acepta la primera | `MAX_CANDIDATOS_VERIFICAR_POR_TRAMO` |
| Verificaciones totales por plan | máx. 12 (1 petición por candidata, ida+vuelta juntas) | `MAX_VERIFICACIONES_TOTALES` |
| Paradas máximas por plan | 8; si se alcanza sin llegar al destino, error `LIMITE_PARADAS_SIN_LLEGAR`, no un plan normal | `MAX_PARADAS` |
| Timeout por petición OSRM | 8 s, con cancelación | `OSRM_TIMEOUT_MS` |
| Distancia mínima origen-destino | 1 km (antes 50 km) | `DISTANCIA_MINIMA_KM` |
| Precio de referencia para ahorro | media del combustible en `todasGasolineras` (mismos datos que el resto de la app) | `calcularEstadisticas(...).media` |
| Desvío de vuelta | verificado por carretera de forma real e independiente de la ida (1 petición OSRM de 3 puntos por candidata) | `obtenerIdaVueltaConTimeout()` |
| Coherencia de escala de la ruta | la distancia acumulada de la geometría se reescala para coincidir con la distancia total de OSRM; aviso si el ajuste supera el 5% | `acumularKmRuta()`, `DESVIACION_GEOMETRIA_AVISO` |

## 4. Limitaciones (resueltas en esta corrección y las que permanecen)

### Resueltas en el commit `56ebc4e` (antes eran limitaciones de `c8eaf29`)

- ~~Desvío de vuelta no verificado por separado (se asumía simétrico)~~ —
  ahora se verifica de forma real e independiente para cada candidata.
- ~~Repostaje fijo al 75% sin mirar cuánto quedaba al llegar~~ — ahora usa
  el balance real, limitado a la capacidad libre del depósito.
- ~~Se aceptaba la primera candidata alcanzable~~ — ahora se compara el
  coste neto real entre todas las verificadas.
- ~~El límite de paradas devolvía un plan con aviso en vez de un error~~ —
  ahora lanza `LIMITE_PARADAS_SIN_LLEGAR`.
- ~~El "ahorro" del viaje (máximo menos media) no reflejaba el plan~~ —
  sustituido por tres cifras explicadas y coherentes entre sí.

### Permanecen

- **No es una optimización global**: se decide tramo a tramo con la mejor
  candidata VERIFICADA de ESE tramo (hasta 3 candidatas), no el conjunto
  óptimo de paradas de todo el viaje — una candidata fuera de las 3 mejores
  en la preselección por línea recta nunca se verifica, aunque hubiera
  resultado mejor.
- **Consumo real variable**: clima, carga, conducción, etc. no se modelan;
  el margen de reserva del 15% es la única protección frente a esa
  variabilidad, y es una estimación, no una garantía de llegada.
- **Precio de referencia es una media de todos los datos cargados**, no del
  tramo exacto — puede no reflejar bien zonas con precios muy dispares.
- **Límite de verificaciones**: si una ruta muy larga necesitara más de 12
  verificaciones en total, el plan se detiene con el error
  `LIMITE_PETICIONES_AGOTADO` en vez de seguir pidiendo rutas
  indefinidamente — no es un caso esperado en trayectos típicos de España,
  pero es un límite real, no infinito.
- **Reincorporación verificada al mismo punto de la ruta**, no a un punto
  posterior: la petición de 3 puntos usa punto de ruta → estación → el
  mismo punto de ruta. Es una verificación real, pero no modela que el
  conductor normalmente continuaría el viaje desde la estación sin
  necesariamente volver exactamente al punto de salida.
- **El marcador de iPhone no se ha confirmado en un dispositivo real** (ver
  sección 6, sin cambios en esta corrección).

## 5. Pruebas y resultados

### Autonomía — `scripts/test-autonomia.ts` (nuevo)

Ejecución: `npx tsx scripts/test-autonomia.ts` desde la raíz del proyecto
(no instalado en `package.json`, ver sección 7). Usa `global.fetch`
mockeado en todos los casos: **cero peticiones reales a OSRM ni a ningún
proveedor**.

```
PASS 1. Viaje cubierto sin repostar
PASS 2. Autonomía baja: primera parada temprana
PASS 3. Autonomía cero: rechazo inmediato sin red
PASS 4. Estación barata fuera de alcance: se descarta por carretera, no por línea recta
PASS 5. Estación barata cuyo desvío elimina el ahorro
PASS 6. Ausencia de estación viable
PASS 7. Varias paradas con balance de combustible coherente, sin retroceso
PASS 8. Preferencia de marca sin alternativas alcanzables en ese tramo
PASS 9a. Fallo de red en la ruta principal: no cuelga, lanza error
PASS 9b. Respuesta vacía/malformada de la ruta principal
PASS 9c. Fallo solo en las verificaciones de desvío: se degrada con claridad, no crashea
PASS 9d. Las peticiones de verificación llevan señal de cancelación (AbortSignal)
PASS 10. Combustible restante conservado y capacidad del depósito respetada
PASS 11. Dos candidatas alcanzables cuyo orden cambia al verificar el desvío real
PASS 12. Ida corta y regreso largo: no se asume simetría
PASS 13. Límite de paradas sin alcanzar destino: error, no un plan normal
PASS 14. Coherencia del resumen económico con las paradas
PASS 15. Coherencia de escala: geometría reescalada a la distancia total de OSRM

18 pasadas, 0 fallidas
```

Cubre explícitamente los 9 casos pedidos en el encargo original (el caso 7
incluye además la comprobación de que no se dispara una petición por cada
estación cercana: 27 candidatas disponibles, ≤7 peticiones totales para 2
paradas) y los 5 casos pedidos en la corrección del 30/10 (10-14), más un
caso 15 adicional para la coherencia de escala geometría/OSRM que también
se pidió comprobar.

**Verificación de que fallan con el código anterior**: antes de dar la
corrección por buena, sustituí temporalmente `lib/routing.ts` por la
versión del commit `c8eaf29` (sin tocar el árbol de trabajo real, restaurado
después) y repetí la suite completa. Resultado: **los 6 casos nuevos (10,
11, 12, 13, 14, 15) fallan contra el código anterior** — confirmando que
cada uno demuestra realmente una corrección, no una comprobación vacía.
(El caso 4 también falló en esa comprobación por un cambio de formato en
el mock de pruebas, no por el código de producción; el caso 9c falló porque
el código anterior no distinguía `FALLO_VERIFICACION_PROVEEDOR` de
`SIN_PARADA_ALCANZABLE` — ambos cambios esperados, no indican un problema.)

### Resto de pruebas, sobre el estado final del código (ambos commits de autonomía)

| Prueba | Resultado |
|---|---|
| `npm run typecheck` | ✅ PASS |
| `npm run build` (sin env, estado real local) | ✅ PASS — 135 kB First Load JS, sin regresión de tamaño |
| `scripts/smoke-ui.cjs` (actualizado: rellena el nuevo campo de autonomía) | ✅ PASS 390×844 y 1280×720 + GPS permitido/error de ruta + estados API error/vacío |
| `scripts/smoke-seo.cjs` | ✅ PASS |
| `scripts/smoke-consent.cjs` (build con clave sintética, sin tráfico real a PostHog) | ✅ PASS 390×844 y 1280×720 |
| Cálculo real Madrid→Valencia (OSRM + MITECO reales, navegador embebido) | ✅ 373 km, 1 parada en Tarancón, desvío real 9.5 km, balance de combustible exacto (ver sección 0) |

`tsconfig.json` confirmado idéntico a HEAD tras todas las pruebas (sin
rutas `.next-consent-test`/`.next-consent-verify`), no incluido en ningún
commit.

### Revisión visual manual (navegador embebido)

- Móvil (375×812) y escritorio: campo "Autonomía restante" con su placeholder,
  botón "Uso el depósito lleno" y mensajes de validación visibles y bien
  maquetados, sin desbordamiento horizontal (confirmado también por la
  aserción `scrollWidth > innerWidth === false` de `smoke-ui.cjs`, que pasa).

## 6. Navegadores realmente utilizados (léase con atención)

Para los marcadores de iPhone, verificado con:

- **WebKit real** (motor, no Safari): build de Windows de WebKit 18.2 que
  distribuye Playwright (`npx playwright install webkit`), headless,
  viewports 375×667 (iPhone SE), 390×844 (iPhone 14) y 1280×720 (escritorio),
  estado normal y seleccionado.
- **Chromium** (Playwright) para el resto de pruebas automatizadas
  (`smoke-ui`, `smoke-seo`, `smoke-consent`, revisión visual manual en el
  navegador embebido de esta sesión).

**Esto NO es Safari en un iPhone real.** Es el mismo motor de renderizado
(WebKit) que usa Safari, corriendo en Windows vía Playwright — no acredita
compatibilidad con Safari en iOS, con una versión concreta de iOS, ni con el
dispositivo real de la amiga de Juan (modelo y versión siguen sin
confirmar). El texto se ve completo y sin recorte en las tres resoluciones
probadas con este motor, lo cual es evidencia razonable a favor del
diagnóstico (falta de `iconSize`) pero no una confirmación del caso real.

## 7. Capturas locales (rutas absolutas)

**Marcadores — WebKit real:**
- `C:\Users\mfbag\AppData\Local\Temp\claude\gasolisto-markers\iphone-se-375x667-mapa-normal.png`
- `C:\Users\mfbag\AppData\Local\Temp\claude\gasolisto-markers\iphone-se-375x667-marcador-seleccionado.png`
- `C:\Users\mfbag\AppData\Local\Temp\claude\gasolisto-markers\iphone-14-390x844-mapa-normal.png`
- `C:\Users\mfbag\AppData\Local\Temp\claude\gasolisto-markers\iphone-14-390x844-marcador-seleccionado.png`
- `C:\Users\mfbag\AppData\Local\Temp\claude\gasolisto-markers\desktop-1280x720-mapa-normal.png`
- `C:\Users\mfbag\AppData\Local\Temp\claude\gasolisto-markers\desktop-1280x720-marcador-seleccionado.png`

**smoke-ui.cjs (Chromium, incluye el flujo de Viajes con autonomía):**
- `C:\Users\mfbag\AppData\Local\Temp\gasolisto-smoke\trip-390.png`
- `C:\Users\mfbag\AppData\Local\Temp\gasolisto-smoke\trip-1280.png`
- (además: `fallback-*.png`, `station-*.png`, `trip-origin-required-*.png`)

**smoke-consent.cjs (Chromium, build con clave sintética):**
- `C:\Users\mfbag\AppData\Local\Temp\gasolisto-consent\preferences-390.png` / `-1280.png`
- `C:\Users\mfbag\AppData\Local\Temp\gasolisto-consent\banner-390.png` / `-1280.png`

## 8. Commits y archivos incluidos

Rama local `lote3-autonomia-viajes` (creada desde el estado ya revisado por
Cerebro Central: `56812ce`, `5b63ceb`, `33ce0f1`). **Nada publicado, sin
push. Historial no reescrito: la corrección es un commit nuevo.**

**`c8eaf29` — feat(trip): plan around remaining range instead of a full tank**
- `types/trip.ts`
- `lib/routing.ts`
- `components/trip/TripPlanner.tsx`
- `scripts/smoke-ui.cjs`
- `scripts/test-autonomia.ts` (nuevo)

**`000535d` — fix(map): give price markers an explicit size so text can't overflow**
- `components/map/MapView.tsx`

**`56ebc4e` — fix(trip): correct fuel balance, stop selection and plan completeness**
(corrección tras revisión de Cerebro Central, ver sección 0)
- `lib/routing.ts`
- `types/trip.ts`
- `components/trip/TripPlanner.tsx`
- `scripts/test-autonomia.ts`

**Dejado fuera a propósito, sin tocar** (pertenece a trabajos anteriores):
`docs/impulso-octubre-2026.md` y el resto de documentación pendiente
(`alternativas-nombre...`, `balance-impulso...`, `comparativa-pararuta-repostop...`,
`encargo-claude-auditoria...`, `investigacion-nombre...`,
`repostop-anterioridades...`).

## 9. Autorrevisión del diff

**Entrega original (`c8eaf29`/`000535d`):** encontré y corregí un cabo
suelto: el código de error `SIN_GASOLINERAS` que lanzaba la versión
anterior de `routing.ts` ya no lo lanza nadie (sustituido por
`SIN_PARADA_ALCANZABLE`/`SIN_PARADA_ALCANZABLE_MARCA`), pero
`TripPlanner.tsx` todavía lo manejaba como caso especial — código muerto
que podía confundir a quien lo leyera después. Se retiró del mapa de
errores y de la condición del `catch`, y se repitieron
typecheck/build/todas las pruebas tras el cambio.

**Corrección (`56ebc4e`):** antes de comprometer la corrección, verifiqué
explícitamente que los 6 casos de prueba nuevos fallan contra el código
anterior (sección 5) — no solo que pasan con el nuevo, que por sí solo no
demuestra que prueben algo real. Al revisar el diff final no encontré
código muerto ni inconsistencias adicionales; además confirmé con un
cálculo real contra OSRM/MITECO (sección 0) que el balance de combustible
cuadra exactamente con la fórmula documentada, no solo en los mocks.

## 10. Bloqueos y siguientes pasos

- **Ninguna tarea quedó bloqueada**, ni en la entrega original ni en la
  corrección. Las 5 correcciones pedidas se aplicaron, probaron (incluida
  la comprobación explícita de que las pruebas nuevas fallan contra el
  código anterior) y commitearon localmente en un commit nuevo.
- **Siguiente paso sugerido (no ejecutado, fuera de este encargo):** validar
  el marcador de iPhone en un dispositivo real cuando se pueda, antes de dar
  el caso de la amiga de Juan por cerrado.
- **Limitación que permanece y podría ser el siguiente foco**, si se quiere
  seguir afinando: la verificación por carretera solo compara hasta 3
  candidatas por tramo (presupuesto de peticiones) y reincorpora siempre al
  mismo punto de la ruta, no a uno posterior — ver sección 4.
- **Pendiente de decisión de Juan/Cerebro Central:** si se aprueban estos
  commits para considerar el cierre técnico como "implementado y validado en
  local", o si se pide ajustar algo más (p. ej. los valores de margen/
  objetivo de repostaje, actualmente heurísticos).
- Como en lotes anteriores: no se ha hecho push, merge, deploy, ni se ha
  tocado Vercel (sigue pausado), dominios ni marca.

## 11. Notion

Acceso comprobado (sesión de Juan, vía Chrome conectado a esta sesión) y
cierre técnico **registrado como comentario** en la página "Mandato actual
— preservar Gasolisto y documentar auditoría y mejoras"
(`https://app.notion.com/p/401ba48de95e81d3b427ec243c50e7c7`), sin editar
el contenido propio de la página ni la base de datos de decisiones:

> Cierre técnico — Autonomía restante en Viajes + legibilidad de precios
> iPhone (29-30/10/2026): implementado y validado en local; pendiente de
> revisión de Cerebro Central y despliegue. Commits locales c8eaf29 /
> 000535d en rama lote3-autonomia-viajes (sobre 56812ce, 5b63ceb, 33ce0f1,
> ya revisados), sin publicar. Nada en producción, Vercel sigue pausado.
> Detalle completo, pruebas, capturas y limitaciones en
> docs/entrega-autonomia-iphone-2026-10-29.md del repositorio.

No se ha marcado el proyecto como publicado en ningún sitio ni se ha
tocado ninguna otra página o base de datos de Notion.

**Nota de esta actualización (30/10):** el comentario de Notion de arriba
se publicó antes de la corrección y todavía cita solo `c8eaf29`/`000535d`.
No he vuelto a escribir en Notion en esta ronda (la corrección no lo pedía
explícitamente); si se quiere, el siguiente comentario debería añadir
`56ebc4e`.
