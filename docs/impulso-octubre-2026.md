# Impulso tras LinkedIn: 7-14 octubre 2026

Juan autoriza ejecutar el roadmap sin Claude. Codex coordina e implementa.
No se necesitan aprobaciones repetidas para cambios validados del alcance.
No comprar servicios ni alterar permisos o credenciales.

## Trabajo actual

- Implementado: aviso accionable junto al buscador cuando falla ubicacion, visible en mapa/lista. Se elimina el aviso duplicado inferior que tapaba parte de Como llegar.
- Implementado y validado: CTA principal Como llegar con Google Maps; conservar alternativa Apple y evento existente maps_route_clicked. Enlaces sin botones anidados.
- Nuevo evento geolocation_fallback_search_clicked: solo superficie, sin coordenadas o texto de busqueda.
- Instalacion local restaurada mediante npm ci: Next 14.2.35 / React 18 coherentes con lockfile. Auditoria: 11 avisos (1 critico, 7 altos, 2 moderados, 1 bajo); resolver en bloque separado urgente.
- typecheck y build correctos tras cambios finales. Pruebas Playwright con fixtures en 390x844 y 1280x720: aviso tras denegacion, foco de busqueda, sin desbordamiento, aviso en Lista y enlaces de rutas. Repeticion final: seleccionar ciudad oculta aviso y CTA de ruta completamente accesible (elementFromPoint). Capturas locales revisadas. Son pruebas controladas, no validacion de disponibilidad de Photon/MITECO.
- Seguimiento de este chat cada dos horas hasta cierre del roadmap o 14 octubre. Automatizacion gasolisto-impulso-tras-linkedin.

## Siguientes entregas

1. Cerrado: bloque UX desplegado el 7 octubre, commit 6857222, Vercel READY y comprobado en dominio publico.
2. Dashboard PostHog proyecto 250159: canales, activacion, embudos ordenados por sesion, estacion a maps y planificador. Revisar trafico interno antes de llamarlo clientes reales.
3. Diagnosticar abandono del planificador y sesiones con friccion; mejorar solo tras reproducir problema.
4. Contenido cercano X/LinkedIn y calendario siete dias, alternando problema y solucion; capturas reales y enlaces de campana.
5. SEO: canonical, sitemap, como-funciona/privacidad, indexacion. No confundir redirecciones previstas con fallo SEO.
6. Seguridad: auditar versiones y actualizar Next con pruebas separadas, conservando compatibilidad React.
7. Actualizar Notion con cada cierre y producir balance para Juan.

## Base de comparacion (consulta anterior del 7 octubre)

Ventana PostHog desde 6 octubre 18:36:08 UTC hasta consulta: 50 visitantes distintos, 77 pageviews. Cohorte LinkedIn: 40 distintos, 60 pageviews. Son contadores de analitica sin filtro interno confirmado, no prueba de clientes ni ahorro real.

Cohorte LinkedIn: 22 personas hicieron alguna accion central (55%); 17 seleccionaron estacion; 11 seleccionaron ciudad; 8 abrieron viaje; 2 abrieron mapas externos; 1 calculo viaje. Estos son agregados de cohorte, NO embudos ordenados. No afirmar que las 11 busquedas ocurrieron despues de denegar ubicacion sin comprobar secuencia.

Ubicacion: 24 personas con algun fallo y 15 con algun exito; categorias pueden solaparse. Denegacion de permiso puede ser previa, no necesariamente rechazo nuevo.

Vercel: 52 visitantes y 79 vistas en ventana horaria aproximada. No equiparar fuentes con visitantes unicos deduplicados ni ventanas distintas.

## Criterios de cierre

- Cambios pequenos con resultado observable y pruebas registradas.
- typecheck y build correctos; UX revisada en movil/escritorio.
- No declarar deploy, Notion o dashboard terminados sin verificarlo.
- Mantener bitacora de commits, deploys, pendientes y bloqueos reales.

## Ejecucion automatica del 9 octubre

- Esta ejecucion confirma que el heartbeat puede iniciar trabajo en este chat. No prueba que todas las ejecuciones anteriores hayan ocurrido.
- Seguridad: Next actualizado a 15.5.27 (Maintenance LTS), React/React DOM a 19.3.0 y tipos correspondientes. PostCSS actualizado a 8.5.29 con override compartido para evitar que Next conserve su version vulnerable fijada. Lockfile regenerado; npm ls confirma dependencias coherentes.
- Fuentes: https://nextjs.org/blog/september-2026-security-release y https://nextjs.org/docs/app/guides/upgrading/version-15.
- Auditoria completa: antes 11 avisos (1 critico, 7 altos, 2 moderados, 1 bajo); ahora 7 (5 altos, 2 moderados), todos asociados a Tailwind 3 y herramientas de compilacion. npm audit --omit=dev: 0 avisos conocidos. No equivale a seguridad absoluta ni cierra el riesgo de desarrollo.
- No se ejecuto audit fix --force: propone Tailwind 4, migracion de estilos separada. Esa tarea permanece pendiente.
- Validacion: typecheck y build pasan; home First Load JS aumenta de 124 a 135 kB por actualizacion de framework. Sin cambios a logica de precios, routing o tracking.
- Pruebas reutilizables: scripts/smoke-ui.cjs / npm run test:smoke. Requiere Playwright instalado o PLAYWRIGHT_MODULE_PATH apuntando al runtime disponible; SMOKE_BROWSER_PATH opcional. SMOKE_URL por defecto http://localhost:3019. Pruebas con fixtures, no metricas ni capturas de contenido para publicar en RRSS.
- Playwright Edge headless: PASS 390x844 y 1280x720 en fallback, ciudad, estacion, viaje, sin errores JS ni overflow; PASS error API/reintento y datos vacios. Chrome headless instalado fallo al arrancar; no se modifico el perfil personal ni se intento desbloquear Windows.
- Prueba real local: API responde 200 con 11522 estaciones y Cache-Control public/max-age=0/s-maxage=300/stale-while-revalidate=3600. Como-funciona, privacidad, sitemap y robots responden 200.
- Revision visual: capturas de detalle y viaje revisadas. Pendiente de Producto: el origen del viaje sigue mostrando Tu ubicacion actual cuando GPS falla; revisar en tarea separada antes de atribuir abandono a esa causa.
- Documentacion de roles local corregida: Codex implementa sin depender de Claude.
- Despliegue de seguridad cerrado: commit f9a0bd4, deployment dpl_DELT415Tqt9ES7F4fNuGi131tAcA, produccion READY. Comprobaciones HTTP del dominio: home, como-funciona, privacidad, robots, sitemap y API 200 (11522 estaciones). Suite completa contra bundle publico PASS en movil/escritorio, error/reintento y vacio, con servicios externos simulados. Script bloquea envios a PostHog/Vercel Analytics para no contaminar datos.
- Siguiente prioridad: dashboard real PostHog 250159 y diagnostico ordenado del planificador; quedan pendientes vulnerabilidades de herramientas de compilacion Tailwind 3.

## Planificador y acceso a datos - 9 octubre 2026

- Problema reproducido: el planificador recibia coordenadas fallback de Madrid como si fueran la ubicacion actual. Ahora requiere origen escrito cuando GPS falla o sigue pendiente, muestra Escribe el origen y explica el bloqueo; no ofrece Mi ubicacion sin GPS disponible. La ciudad seleccionada en el mapa no se convierte silenciosamente en origen del viaje.
- Con GPS permitido se mantiene el origen automatico. Se bloquean calculos concurrentes, incluido Enter repetido. Logica de precios, coste, rutas y recomendaciones intacta.
- Nuevos eventos trip_calculation_started y trip_calculation_failed permiten distinguir intento, exito y error; solo categorias de error conocidas y propiedades no sensibles, nunca texto libre ni coordenadas. Ingestion real pendiente de verificar en PostHog.
- Validacion: typecheck/build correctos; smoke PASS movil/escritorio, origen obligatorio incluso con Enter (cero peticiones de ruta), calculo con origen escrito, GPS permitido, error de ruta recuperable, error API/reintento y vacio. Capturas del aviso revisadas en ambos tamanos. Pruebas con servicios simulados y analitica bloqueada; no son evidencia de disponibilidad externa ni de mejora de conversion.
- Dashboard bloqueado: projects-get solo devuelve Default project 249360 sin ingestion; organizations-get solo devuelve una organizacion GASOLISTO. El proyecto real EU 250159 no aparece en la conexion. No se crearon insights en el proyecto equivocado ni se reutilizaron metricas del 7 octubre como actuales. El inventario de navegador de esta sesion tampoco ofrece Chrome autenticado.
- Despliegue cerrado: commit 0d8f352, deployment dpl_3fucfyy28YmWxm2EpSViK9fvuAPt, produccion READY. Dominio responde 200; suite completa sobre bundle publico PASS con proveedores simulados y sin envios a analitica. Notion actualizado con cierre y bloqueo de acceso a PostHog.

## Dashboard PostHog cerrado - 9 octubre 2026

- Acceso recuperado mediante Chrome autenticado al proyecto EU 250159. El bloqueo del conector sigue vigente (solo expone 249360); no se uso ese proyecto para datos ni cambios.
- Dashboard nativo creado y verificado: https://eu.posthog.com/project/250159/dashboard/1011138, Gasolisto: trafico y utilidad. El dashboard anterior y sus consultas compartidas se conservan.
- Siete graficos: alcance 30 dias (JOIEHiP5), fuentes 7 dias (12e38SuC), pageviews 7 dias (DPjJD0vc), sesiones 7 dias (zQzx7p11), estacion a Maps (CWRPEhrU), fallo GPS a ciudad (p8l5S16s), abrir viaje a calculo completado (KgLcvRf6).
- Filtro predeterminado guardado: evento $host exactamente gasolisto.com. Excluye localhost/preview, pero no nuestras visitas en el dominio publico. Cohorte Internal / Test users 212148: 0 personas, criterio person $internal_or_test_user = true. No se cambiaron permisos ni se marcaron visitantes desconocidos como internos.
- Los tres embudos nuevos son secuenciales, cuentan sesiones unicas y usan ventana de conversion de 30 minutos, con filtro interno activado. El filtro interno no garantiza limpieza mientras la cohorte este vacia. No unen automaticamente acciones de dias distintos.
- Lectura verificada con filtro de dominio: alcance 30 dias 98 usuarios analiticos; semana 2-9 octubre UTC (dia 9 parcial), 142 pageviews y 98 sesiones con pageview. No mezclar estas ventanas ni llamar clientes a los identificadores analiticos.
- Misma semana y dominio: estacion a Maps 34 -> 2 sesiones (5.88%); fallo GPS a ciudad 59 -> 19 (32.20%); abrir viaje a calculo completado 16 -> 1 (6.25%). Muestra pequena y posiblemente interna; no demuestra ahorro, llegada fisica, efecto causal de LinkedIn ni eficacia del arreglo de hoy. Maps no queda restringido a la misma estacion ni a una superficie concreta.
- Fuentes: LinkedIn encabeza el grafico de referentes de 7 dias. No sumar desgloses de visitantes como si estuvieran deduplicados entre canales.
- Busqueda de trip_calculation_ en definiciones de eventos: sin resultados. Ingestion real de los eventos nuevos sigue pendiente; no equivale a cero intentos ni errores. No se enviaron eventos sinteticos para inflar metricas.
- Revision visual: embudos renderizados y cifras contrastadas con sus vistas de detalle; captura local de evidencia guardada fuera del repositorio. Este cierre no modifica codigo de la app, por lo que no requiere un nuevo build ni despliegue.
- Siguiente accion: confirmar ingestion durante uso real, resolver marcado fiable de pruebas internas y observar evolucion tras cambios. Mantener pendientes SEO, calendario/capturas reales y migracion separada de herramientas Tailwind.

## SEO y contenido explicativo - 9 octubre 2026, noche

- Auditoria HTTP del dominio: home, como-funciona, privacidad, sitemap y robots 200. Canonical propio en las tres paginas HTML: https://gasolisto.com, /como-funciona y /privacidad. HTTP redirige 308 a HTTPS; www redirige 307 al dominio sin www. Son redirecciones observadas, no prueba de error de indexacion ni de indexacion correcta. Search Console no se ha consultado en este bloque.
- Corregidas FAQ que prometian precios instantaneos y solo Madrid sin GPS. Ahora explican cache, fecha de actualizacion, busqueda de ciudad sin permiso y origen escrito para viajes sin ubicacion. Diferencian distancias en linea recta de rutas por carretera, mencionan coordenadas enviadas al servicio de rutas y aclaran que el ahorro es estimado.
- Fecha real de modificacion de como-funciona en sitemap: 2026-10-09. El contenido visible y FAQPage usan la misma lista de preguntas/respuestas.
- Suite reutilizable scripts/smoke-seo.cjs: canonical, un H1, siete FAQ coincidentes con contenido visible, ausencia de overflow en 390x844/1280x720, sitemap/robots. Analitica bloqueada en todas las visitas de prueba. PASS local, typecheck/build correctos y capturas movil/escritorio revisadas.
- Cierre: commit 4ec0652, deployment dpl_6k8sgLyTrHrLJt5856T6m1kTxuNd, produccion READY y gasolisto.com asignado. Suite SEO/FAQ repetida sobre dominio publico PASS movil/escritorio y sitemap/robots. No acredita indexacion en Google. Notion actualizado con resultado y pendientes.
- Hallazgo prioritario separado: privacidad sigue sin mencionar PostHog y afirma que no es posible identificar a visitantes y que ubicacion nunca sale del dispositivo. El codigo usa SDK PostHog y envia coordenadas al proveedor de rutas. Revisar descripcion de servicios, identificadores/almacenamiento, configuracion efectiva y consentimiento con fuentes oficiales; no declarar cumplimiento legal ni anonimato absoluto. No se han cambiado permisos, credenciales ni preferencias de seguimiento.
- Proximos pendientes: revision de privacidad/consentimiento, ingestion de nuevos eventos e internos; Search Console; contenido/capturas reales siete dias; riesgos Tailwind de desarrollo.

## Privacidad informativa - 10 octubre 2026

- Corregida la pagina /privacidad: elimina promesas de anonimato absoluto y de que toda ubicacion permanece en el dispositivo. Describe PostHog, Vercel, almacenamiento local de configuracion, texto y referencia enviados a Photon, coordenadas de rutas a OSRM, mapas externos y cuestionario Google Forms. Incluye contacto.gasolisto@gmail.com, correo elegido por Juan. No se declara cumplimiento legal completo.
- Fecha de modificacion de privacidad actualizada en sitemap a 2026-10-10. Codigo de seguimiento y permisos no modificados; no afirmar que esta entrega resuelva el consentimiento.
- Fuentes consultadas: https://vercel.com/docs/analytics/privacy-policy (analitica agregada sin cookies de terceros y Resilient Intake en v2), https://posthog.com/docs/data/anonymous-vs-identified-events (identificadores anonimos no son ausencia de identificadores), https://www.aepd.es/guias/guia-cookies.pdf y https://www.aepd.es/preguntas-frecuentes/2-tus-obligaciones-como-responsable-del-tratamiento/6-el-deber-de-informacion/FAQ-0248-sobre-si-el-usuario-tiene-que-dar-consentimiento-a-clausula-de-privacidad. Lectura directa de docs PostHog devuelve formato markdown no compatible con web; se contrasto el resumen oficial indexado y el codigo local. No se verifico configuracion remota de replay/retencion.
- Pruebas SEO reforzadas: bloqueo de todo trafico salvo documentos y recursos Next del mismo origen, service workers desactivados. No depende de reconocer /_vercel/insights, que puede cambiar con Vercel Analytics v2. Los bloqueos anteriores por patrones no acreditan cobertura de todas las rutas aleatorias: no se cuantifica contaminacion historica sin evidencia.
- Cierre informativo: typecheck/build correctos. Suite SEO/FAQ PASS local y sobre dominio publico en 390x844 y 1280x720, con privacidad, contacto, canonical, sitemap y ausencia de overflow. Capturas revisadas. Commit 0314ccf; despliegue dpl_AjkNA3cY7behnpJAmpDswr9MeuaX READY, gasolisto.com asignado. Notion actualizado. Esto no cierra consentimiento ni revision legal.
- Pendiente prioritario: consentimiento efectivo, bloqueo previo y retirada/cambio de preferencia con pruebas de red; revisar autocapture, grabaciones, minimizacion de URL y retencion. PostHog se inicia actualmente sin una preferencia explicita; la correccion del texto no remedia ese comportamiento. Revision juridica del responsable, bases, plazos y derechos sigue abierta; no inventar identidad ni plazos legales.
- Despues: ingestion de nuevos eventos, internos, Search Console, contenido/capturas reales y migracion Tailwind separada. No se reutilizaron cifras de ayer como nuevas metricas.
