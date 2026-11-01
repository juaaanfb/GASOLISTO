# Respaldo GitHub sin despliegue

Autorización de Juan del 01/11/2026: avanzar con el respaldo de código y documentación preservando la pausa y sin decidir marca. Encargo preparado por Cerebro Central; debe enviarse a Claude para su ejecución. No permite reactivar la web.

## Estado comprobado por Cerebro

- Carpeta: C:\Users\mfbag\OneDrive\Escritorio\Juan\GASOLISTO.
- Rama observada lote4-revision-integral, HEAD 3f5fa116789bec4f2104990759d87b29c620e7b5.
- git ls-remote origin del 01/11: main d454657d4cece86572e38544b8081b1221208a50, master 6e5b4868105f644c1c7d3dc8a2cc2f5c4296bcff. 19 commits en HEAD respecto a main.
- Vercel get_project, proyecto prj_K0RxBua8AXEKVTjfSvh8xYWkrEzC, equipo team_xF9BxgqJos9rEuPw03VRH8Yo: live:false, último deployment señalado READY. No se obtuvo configuración Git en esa respuesta; no demuestra previews desactivados.
- No se ha hecho push ni merge. No hay .github visible en este checkout.
- Documentación pendiente de Cerebro debe conservarse y respaldarse: inspeccionar estado real, no adivinar lista.

## Objetivo autorizado

Guardar en GitHub una rama de respaldo completa del trabajo local revisado y su documentación, SIN build/despliegue de Vercel y sin tocar main/master remotos. No abrir PR: podría activar automatismos innecesarios. No renombrar repositorio ni crear servicios.

## Secuencia

1. Comprueba estado Git, autoría de cambios, instrucciones aplicables y conexiones. No sobrescribas nada. Verifica que no hay un despliegue en curso provocado por otra sesión.
2. Inspecciona configuración Vercel/Git existente y eventuales workflows remotos. La pausa live:false no basta para autorizar un push sin control.
3. Prepara una rama nueva `codex/respaldo-relanzamiento-2026-11-01` desde HEAD, siempre que no exista; si existe, inspecciónala sin reset ni force. Conserva todos los cambios documentales pendientes.
4. Puedes implementar en esa rama una protección explícita de configuración, consultando la documentación oficial actual: `git.deploymentEnabled: false` en vercel.json. Si ya existe, combina la propiedad sin perder otras opciones. Esta protección se autoriza solo para el respaldo; no modificar credenciales, permisos, conexión Git ni la pausa remota. No sustituirla por suposiciones sobre nombre de rama, etiquetas o mensajes de commit.
5. Valida sintaxis/configuración con las herramientas ya disponibles y deja documentado que habrá que revisar expresamente la política de despliegue antes del futuro relanzamiento. Si no puedes acreditar que Vercel respetará la protección para esta primera subida, NO subas: entrega el bloqueo concreto.
6. Revisa la documentación pendiente y guárdala en commits documentales seleccionando rutas explícitamente. No cambies sus hechos ni atribuyas nuevas pruebas a Cerebro. Incluye informes de autonomía e inventarios/checklists de Cerebro. Excluye secretos, archivos .env, configuraciones privadas, historiales del navegador, carpetas de build y paquetes de respaldo.
7. Comprueba el diff final, detector de secretos disponible o revisión equivalente, archivos ignorados y cualquier ejecución automática de GitHub. No añadas herramientas/servicios de pago. Ejecuta los checks pertinentes al cambio de configuración; no migres dependencias ni modifiques la aplicación.
8. Solo si queda acreditada la ausencia de despliegues automáticos para esa rama y no hay otro automatismo que publique: push normal únicamente a `refs/heads/codex/respaldo-relanzamiento-2026-11-01`. Prohibido force, push --all/--mirror, tags generales o cambios a main/master.
9. Verifica con git ls-remote que el SHA remoto es el commit final exacto. Consulta Vercel para comprobar que no se ha creado ningún deployment para ese SHA/rama. Si aparece una compilación inesperada, cancela exclusivamente esa nueva operación de respaldo, mantén la pausa, documenta el incidente y no vuelvas a intentar publicar.
10. Entrega enlace de la rama, hashes, documentos incluidos y evidencia de ausencia de despliegue. Cerebro centraliza Notion. Si un bloqueo impide el push, conserva el trabajo local y explícalo sin afirmar respaldo remoto completado.

## Copias recuperables ya creadas por Cerebro

- Principal local: C:\Users\mfbag\.codex\backups\gasolisto\2026-11-01-121308.
- Copia dentro de OneDrive: C:\Users\mfbag\OneDrive\Escritorio\Juan\RESPALDOS_GASOLISTO\2026-11-01-121308.
- Bundle Git completo, ZIP de 86 archivos incluidos documentos pendientes, inventario SHA256, estado Git y guía de recuperación. Historial restaurado en repositorio de prueba y verificado; hash de cada entrada ZIP y segunda copia comprobados.
- Sincronización OneDrive NO verificada. No son una confirmación de copia fuera del dispositivo.
- El paquete corresponde al estado anterior a este nuevo encargo. No contiene credenciales, .env, node_modules, builds ni datos locales del navegador. El bundle preserva historial Git; no publiques el bundle como adjunto público.

No se autoriza compra, cambio de marca/dominio/correo, redes, publicación de la aplicación, modificación de permisos ni reactivación de Vercel. Al terminar, detente para revisión.
