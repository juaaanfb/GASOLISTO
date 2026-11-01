# Control temporal de publicación y respaldo

## Decisión autorizada por Juan el 01/11/2026

Juan autorizó desactivar las vistas previas automáticas para poder guardar el código y documentación en GitHub, manteniendo la conexión GitHub–Vercel y la web pausada. También pidió recordar que se recuperará el flujo conectado al relanzar.

## Cambio aplicado por Cerebro

- Proyecto Vercel: gasolisto, prj_K0RxBua8AXEKVTjfSvh8xYWkrEzC, equipo team_xF9BxgqJos9rEuPw03VRH8Yo.
- Ajuste API: `previewDeploymentsDisabled: true`. Anterior: Preview Branch Tracking activado para todas las ramas no asignadas. Posterior comprobado en Chrome: Preview Branch Tracking desmarcado, Save deshabilitado (estado guardado).
- No se desconectó GitHub, no se cambiaron credenciales/permisos, no se modificó la rama de producción ni se reactivó el sitio.
- Production Branch Tracking observado: main. Auto-Assign Custom Production Domains ya estaba desactivado y no se modificó.
- La rama de respaldo además contiene vercel.json con git.deploymentEnabled:false limitado al nombre exacto `codex/respaldo-relanzamiento-2026-11-01`.
- La desactivación de previews no impide despliegues manuales por API/CLI ni desactiva automáticamente los builds de main. Por eso no se permite subir o fusionar main como parte de este respaldo.

## Respaldo autorizado

Se subirá únicamente `codex/respaldo-relanzamiento-2026-11-01`, sin force, PR, merge ni tags. Verificar SHA remoto exacto después y ausencia de nuevos deployments para la rama/commit. Estado remoto anterior: main d454657d4cece86572e38544b8081b1221208a50, master 6e5b4868105f644c1c7d3dc8a2cc2f5c4296bcff.

La aprobación inicial a Claude que prohibía toda modificación remota queda ampliada solo por esta autorización concreta de Juan a Cerebro. El informe de bloqueo anterior se conserva como histórico, no como descripción del estado posterior.

## Obligatorio antes del futuro relanzamiento

1. Revisar y decidir con Juan la política Git/deploy del dominio y marca definitivos; no reactivar nada por una instrucción histórica.
2. Si se recuperan previews automáticos, volver a activar Preview Branch Tracking (API previewDeploymentsDisabled:false) y comprobar que el cambio está guardado. Este es el ajuste que temporalmente se cambió hoy.
3. Revisar vercel.json: la regla actual protege solo la rama de respaldo. No retirarla indiscriminadamente ni asumir que bloquea todas las ramas.
4. Revisar producción/main y Auto-Assign Custom Production Domains, actualmente desactivado desde antes de este cambio. No encenderlo automáticamente: acordar si se usará promoción manual o automática.
5. Validar marca/dominio, DNS/HTTPS, variables, privacidad y pruebas del candidato final antes de desplegar. La pausa y el control de previews son ajustes diferentes; restaurar uno no autoriza cambiar el otro.
6. Tras autorización de publicación, verificar GitHub→Vercel con el SHA esperado, el dominio correcto, disponibilidad pública e ingestión analítica real sin mezclar pruebas con usuarios.

No olvidar este documento al preparar la publicación. No es autorización anticipada para reactivar previews o producción.

## Resultado comprobado del primer respaldo remoto

Subida completada de la rama autorizada, SHA d5fe55249c300c9176f69dc7504f17ff1bfcfc8b, coincidente entre HEAD y git ls-remote. Main y master remotos conservaron sus SHA anteriores. No se abrió PR ni se hizo merge.

Después del push, list_deployments filtrado por rama y por ese SHA devolvió cero deployments. get_project mantuvo live:false y el mismo último deployment de main anterior. La conexión sigue existiendo; solo los previews automáticos quedaron desactivados.

Este cierre documental se guardará después como un commit adicional en la misma rama de respaldo, manteniendo las protecciones. Comprobar su SHA final con git ls-remote; el SHA anterior sirve como evidencia del primer push, no necesariamente como HEAD definitivo.
