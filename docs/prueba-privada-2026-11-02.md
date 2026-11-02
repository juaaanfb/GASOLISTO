# Entorno privado para pruebas de usuarios — 02/11/2026

Juan pidió un enlace que pueda enviar a probadores sin abrir la web a todo el público. Autoriza este entorno privado, no reactivar el dominio antiguo ni publicar el relanzamiento.

## Resultado

- Proyecto Vercel separado: pruebas-movilidad, `prj_sEUhfsTcGo0U1EvdWP9zB1bQYW8Y`, equipo original `team_xF9BxgqJos9rEuPw03VRH8Yo`.
- Node 24.x, mismo código revisado del respaldo GitHub, SHA `886bbbfda53a66a79611fbfe32a7bae68fd039ad`.
- Deployment `dpl_B2VvJiWawwPuURitHP3xFxGwFkKu`, construido correctamente. Aunque se solicitó staging, Vercel asignó este primer deployment como production del proyecto de pruebas; NO es producción del proyecto original. Protección `ssoProtection.deploymentType:all` establecida ANTES de desplegar.
- URL normal protegida: https://pruebas-movilidad-o1d6k9oox-gasolisto.vercel.app/ . No contiene el acceso compartible.
- Se creó un Shareable Link limitado a ese deployment, TTL 604800 segundos (7 días). Se entrega únicamente en el chat a Juan. No guardar el parámetro secreto en GitHub, Notion, capturas ni documentación pública.
- Cualquier persona que reciba el enlace puede usarlo y reenviarlo. No es una lista individual de invitados; no garantiza que el receptor no lo distribuya. El enlace se puede revocar desde Share/Deployment Protection del proyecto de pruebas. El vencimiento del enlace no acredita cierre inmediato de toda sesión ya autenticada.
- No se contrató plan ni se compró dominio. Se usa el plan Hobby existente; no se garantiza uso ilimitado fuera de sus límites.

## Verificación efectuada por Cerebro

- Petición sin cookies ni enlace: HTTP 302 a autorización.
- Enlace compartible, sesión HTTP nueva: HTTP 200 con HTML de la aplicación.
- Misma sesión autorizada, /api/gasolineras: HTTP 200, ok:true y 11424 estaciones en esta consulta. No son métricas de uso ni promesa de cifra permanente.
- Chrome: bienvenida y mapa cargan; observados 57 marcadores de la zona por defecto. Se rechazó analítica durante la comprobación. No se concedió ubicación ni se enviaron formularios.
- Se evitó configurar una clave real de PostHog en el proyecto separado. No se transfirieron secretos del proyecto original; no afirmar que pruebas de este entorno aparecerán en PostHog 250159.
- No se repitieron todas las suites de regresión en remoto; esta verificación acredita protección/acceso, carga de app y datos, no ausencia absoluta de fallos.

## Proyecto anterior y controles conservados

- Intento previo de desplegar en el proyecto original: `dpl_2d6BMEG4zQfcjftAQAQYqwXPmSo7`, BLOCKED. Panel confirmó motivo: proyecto pausado. No se intentó desbloquear mediante reanudación.
- Se añadió Standard Protection al proyecto original (`prod_deployment_urls_and_all_previews`) para preparar aquel intento; quedó activada, no debilitada. La pausa original y previews automáticos desactivados se conservaron.
- Proyecto separado con previews automáticos desactivados y autoAssignCustomDomains:false. No se conectó un dominio personalizado ni se promocionó a los dominios antiguos.
- GitHub/main/master, código y marca permanecen sin cambios por esta operación. El despliegue se tomó de GitHub; los archivos .vercel locales siguen vinculando al proyecto original.

## Para retomar o actualizar

1. Leer este documento y docs/control-publicacion-y-respaldo-2026-11-01.md. Distinguir proyecto de pruebas y proyecto público.
2. Mantener protección all ANTES de cada nuevo deployment privado. No copiar variables reales de analítica sin una estrategia autorizada para separar pruebas.
3. El enlace está asociado a esta versión concreta; no prometer que incorpora cambios futuros. Nueva versión puede requerir renovar/revocar enlace conforme al límite del plan.
4. Actualizar/revocar acceso desde el proyecto pruebas-movilidad, no el proyecto original. No publicar el token en notas públicas ni reenviarlo a servicios ajenos.
5. Marca/dominio y publicación general siguen pendientes. No reactivar producción por el hecho de que exista esta beta privada.

Fuentes oficiales consultadas: https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication y https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/sharable-links .
