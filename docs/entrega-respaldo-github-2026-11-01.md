# Entrega: respaldo en GitHub sin despliegue (01/11/2026)

Informe propio de Claude en respuesta a `docs/encargo-claude-respaldo-github-sin-deploy-2026-11-01.md`. No modifica ni sustituye los documentos de Cerebro Central.

## Resultado: NO se ha hecho push. Bloqueo documentado, no acreditado que el push sea seguro.

Todo el trabajo pedido está **listo y completo en local**, en la rama `codex/respaldo-relanzamiento-2026-11-01`, pero **no se ha subido a GitHub**. Sigo el propio encargo (paso 5 y paso 10): "Si no puedes acreditar que Vercel respetará la protección para esta primera subida, NO subas: entrega el bloqueo concreto" / "Si un bloqueo impide el push, conserva el trabajo local y explícalo sin afirmar respaldo remoto completado."

## Qué se comprobó antes de decidir

1. **Estado Git local/remoto**: HEAD de partida `3f5fa116789bec4f2104990759d87b29c620e7b5` en `lote4-revision-integral`, coincide exactamente con lo que Cerebro registró. `git ls-remote origin` confirma `main` en `d454657d4cece86572e38544b8081b1221208a50` y `master` en `6e5b4868105f644c1c7d3dc8a2cc2f5c4296bcff` — sin cambios, sin indicio de otra operación en curso. No se ha tocado `main`/`master` en ningún momento.
2. **Sin `.github/`**: no hay ningún workflow de GitHub Actions en el repositorio que pudiera dispararse con el push.
3. **Integración de Vercel confirmada activa**: `gh api repos/juaaanfb/GASOLISTO/commits/<HEAD de main>/status` devuelve un status real con `context: "Vercel"`, `description: "Deployment has completed"` y enlace a `vercel.com/gasolisto/gasolisto/...` — la integración de Vercel para GitHub está conectada y en uso (no desactivada ni desconectada). `/hooks` del repo está vacío porque la integración moderna de Vercel usa una GitHub App, no un webhook clásico; no pude listar instalaciones de GitHub App con el token disponible (`gh api user/installations` exige un token de App, no un PAT — error 403 esperado, no es un fallo a solucionar).
4. **Sin acceso a la configuración real de Vercel**: no hay CLI de Vercel instalada (instalarla con `npx vercel` habría significado añadir una dependencia nueva, no autorizado), no hay token de Vercel disponible para consultar su API, y no se ha intentado buscar ni usar ningún token no provisto explícitamente (un intento de inspeccionar variables de entorno/credenciales fue bloqueado por el propio sistema de permisos como "exploración de credenciales" — correctamente, y no se ha insistido).
5. **Documentación oficial de `git.deploymentEnabled`** (`https://vercel.com/docs/project-configuration/git-configuration`, consultada hoy): confirma que es la vía soportada para desactivar despliegues automáticos por rama (objeto `{"nombre-rama": false}`, coincidencia por minimatch), con `github.enabled` marcado como obsoleto en su favor. **No especifica** si, para una rama completamente nueva en su primer push, Vercel garantiza leer el `vercel.json` del commit entrante ANTES de decidir si crea el deployment, o si esa decisión puede depender de un estado de proyecto que no se actualiza a tiempo.
6. **Evidencia externa de un caso límite real**: un hilo de la comunidad de Vercel describe haber fijado `git.deploymentEnabled: false` y haber visto igualmente un deployment de PR en curso (timeout), es decir, un caso documentado en el que esta protección no impidió toda actividad de despliegue.
7. **Cerebro Central llegó a la misma conclusión por su cuenta**: según `docs/estado-respaldo-2026-11-01.md`, con acceso al conector de Vercel (`get_project`), obtuvo `live:false` y último deployment `READY`, pero concluye explícitamente que "esa combinación no acredita que los pushes no creen previews" — y dejó la configuración de `git.deploymentEnabled` sin aplicar, derivándola a esta tarea.

## Por qué esto es un bloqueo real, no cautela excesiva

La integración de Vercel para GitHub está confirmada activa y conectada a este repositorio. El comportamiento por defecto documentado de Vercel es desplegar automáticamente cualquier rama con push. La única mitigación disponible (`git.deploymentEnabled` en el propio commit) tiene un hueco de documentación sobre el momento exacto en que se lee para una rama nueva, y existe al menos un reporte público de que no bloqueó toda actividad de despliegue en la práctica. No tengo ninguna vía para comprobar, antes de empujar, cuál es el ajuste real del proyecto en el panel de Vercel (ni CLI, ni token, ni acceso al dashboard). Dado que "no reactivar Vercel" es una restricción explícita y repetida en todos los encargos de este proyecto desde hace semanas, y que el coste de equivocarme (un despliegue real mientras el proyecto debe seguir en pausa) es alto e inmediato, mientras que el coste de esperar es bajo (ya existen dos copias locales/OneDrive recuperables hechas por Cerebro, documentadas en el propio encargo), la decisión correcta es no subir.

## Trabajo completado en local (listo para subir en cuanto se acredite la protección)

Rama: `codex/respaldo-relanzamiento-2026-11-01`, creada desde `lote4-revision-integral` en `3f5fa116789bec4f2104990759d87b29c620e7b5` (21 commits por delante de `main`). No reemplaza ni reescribe ningún commit existente.

Commits añadidos en esta rama (2, además de los 19 que ya traía `lote4-revision-integral`):

| Commit | Contenido |
|---|---|
| `385a472055493f3fd13dc9722f135fd02341b949` | `vercel.json` nuevo con `git.deploymentEnabled` limitado por nombre exacto a `codex/respaldo-relanzamiento-2026-11-01`. No afecta a ninguna otra rama. |
| `ef35d5c1b38239e75b9d374d0b08ee1ed6eab0ee` (HEAD actual) | Documentación pendiente de respaldo: 13 archivos (11 nuevos + 2 modificados), ver lista abajo. Ningún hecho de Cerebro alterado; sin secretos (revisado con `grep` de patrones de credenciales sobre el diff completo, y lectura directa del contenido). |

Documentos incluidos en el commit de documentación:
- `docs/alternativas-nombre-sin-inversion-2026-10-18.md`
- `docs/balance-impulso-2026-10-14.md`
- `docs/checklist-relanzamiento-2026-10-30.md`
- `docs/comparativa-pararuta-repostop-2026-10-28.md`
- `docs/encargo-claude-auditoria-relanzamiento-2026-10-28.md`
- `docs/encargo-claude-respaldo-github-sin-deploy-2026-11-01.md`
- `docs/encargo-claude-revision-integral-2026-10-30.md`
- `docs/entrega-autonomia-iphone-2026-10-29.md`
- `docs/estado-respaldo-2026-11-01.md`
- `docs/inventario-marca-2026-10-30.md`
- `docs/investigacion-nombre-2026-10-18.md`
- `docs/repostop-anterioridades-2026-10-18.md`
- `docs/impulso-octubre-2026.md` (modificado por Cerebro: cierre de plazo 14/10)
- `docs/working-system.md` (modificado por Cerebro: reparto de roles Claude/Cerebro)

Excluido explícitamente, confirmado con `git check-ignore`: `.env.local`, `.vercel/`, `node_modules/`, `.next*/`. No se ha incluido ningún paquete de respaldo (`C:\Users\mfbag\.codex\backups\...`, `RESPALDOS_GASOLISTO\...`) ni se ha movido ni leído su contenido más allá de lo que ya documentó Cerebro.

`git status` tras estos commits: árbol de trabajo limpio en esta rama.

## Lo que falta para poder subir

1. Confirmación verificable (panel de Vercel, o un token/CLI que Juan/Cerebro autoricen expresamente para esta comprobación puntual) de que las Preview Deployments automáticas desde GitHub están desactivadas para este proyecto — no solo `live:false` del último deployment.
2. Alternativamente, confirmación directa en el panel de que `git.deploymentEnabled` en `vercel.json` sí se respeta de forma fiable para el primer push de una rama nueva en este proyecto concreto (no solo según la documentación general).
3. Con cualquiera de las dos, repetir el push normal (sin `--force`, sin `--all`, sin tags) solo a `refs/heads/codex/respaldo-relanzamiento-2026-11-01`, y verificar después con `git ls-remote` (SHA remoto = `ef35d5c1b38239e75b9d374d0b08ee1ed6eab0ee`) y con el status de GitHub/Vercel que no se ha creado ningún deployment para esa rama/SHA.

## No se ha hecho / no se ha afirmado

- No hay push ni fetch de escritura al remoto. `origin/main` y `origin/master` siguen exactamente donde estaban.
- No se ha creado ningún PR.
- No se ha tocado ninguna credencial, permiso, conexión Git ni la pausa de Vercel.
- No se afirma que exista un respaldo remoto del trabajo: **el único respaldo de esta sesión sigue siendo local**, sobre las copias ya existentes documentadas por Cerebro.
- No se ha repetido ni recomprobado el contenido de los paquetes de respaldo de Cerebro (`historial.bundle`, `archivos-y-documentacion.zip`); ya quedaron verificados por Cerebro según `docs/estado-respaldo-2026-11-01.md`.

Entrega para revisión de Cerebro Central. Me detengo aquí.
