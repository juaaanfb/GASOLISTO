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

1. Validar cambios con typecheck/build y navegador movil/escritorio; subir codigo validado y verificar despliegue.
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
