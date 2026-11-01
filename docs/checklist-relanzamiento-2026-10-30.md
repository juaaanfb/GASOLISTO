# Relanzamiento: estado y controles pendientes

Actualizado por Cerebro Central el 01/11/2026. Complementa el checklist histórico `docs/launch-checklist.md`; ese documento no acredita el estado actual.

## Estado comprobado

| Lote | Evidencia local | Alcance de verificación |
|---|---|---|
| Seguridad | 56812ce | Diff y archivos comprobados por Cerebro; suite completa declarada por Claude |
| Consentimiento | 5b63ceb, 33ce0f1 | Código/commits revisados; captura simulada probada por Claude, sin ingestión real del código nuevo |
| Viajes | c8eaf29, 56ebc4e | Cerebro revisó corrección y ejecutó 18 pruebas deterministas y typecheck: PASS |
| Marcadores | 000535d | Diff revisado; WebKit probado por Claude, iPhone físico pendiente |

No se ha repetido el build ni toda la suite visual por Cerebro. No se ha comprobado en este cierre el panel Vercel, GitHub remoto o Search Console. Se mantiene la instrucción de no publicar ni reactivar.

## Trabajo independiente del nombre

- [x] Conciliar el estado de los lotes en el cuerpo del Mandato actual de Notion (30/10), conservando historial.
- [x] Actualizar roles en docs/working-system.md: Claude desarrolla, Cerebro revisa/documenta.
- [x] Preparar inventario de marca en docs/inventario-marca-2026-10-30.md.
- [x] Preparar encargo de revisión integral: docs/encargo-claude-revision-integral-2026-10-30.md. Pendiente de que Juan lo envíe; no supone inicio automático.
- [x] Claude: revisión integral y correcciones acotadas entregadas en lote4-revision-integral; informe 882a564 actualizado por 3f5fa11. Seguimiento a209226, 0797378 y 5a196c5 revisado por Cerebro. No equivale a cobertura exhaustiva: ver limitaciones en informe.
- [ ] Revisar textos frente al producto: “ahorro real”, alcance efectivo de alertas, descuentos y autonomía nueva; no prometer avisos en segundo plano sin soporte comprobado.
- [x] Claude: prueba PWA con service worker activo, caída y recuperación del servidor local; fallback de home limitado a `/`, nunca otra ruta. Evidencia en smoke-pwa-offline.cjs y su informe. No es una prueba de desconexión total de Internet ni de todos los estados de datos caducados.
- [ ] Revisar rendimiento con condiciones declaradas, sin inventar métricas de usuarios ni umbrales arbitrarios.
- [ ] Conservar evidencias e informes fuera de Temp y preparar respaldo seguro; los documentos nuevos siguen sin commit hasta revisarlos.
- [ ] Comprobar GitHub/Vercel y posibles despliegues de ramas antes de proponer un push de respaldo. No ejecutar push con la autorización actual.

## Decisiones pendientes

- [ ] Nombre final con antecedentes y límites de investigación visibles. Disponibilidad del dominio no equivale a libertad de marca.
- [ ] Dominio y gasto autorizados expresamente por Juan.
- [ ] Nuevo contacto público: no inventar un correo; el existente elegido por Juan es contacto.gasolisto@gmail.com.
- [ ] Política para datos locales, consentimiento e identificadores bajo nueva marca/dominio. No borrar preferencias ni migrar consentimiento silenciosamente.
- [ ] Autorizar publicación cuando los bloqueantes estén cerrados.

## Preparación tras decidir marca, aún no autorizada

- Aplicar inventario: textos, metadata, PWA, imágenes, formulario y configuraciones externas.
- Validar SITE_URL/canonical/OG/robots/sitemap y enlaces del dominio final.
- Mantener historial técnico y bases de analítica: no borrar proyecto PostHog ni renombrar recursos por sustitución global.
- Revisar contacto y privacidad sin afirmar cumplimiento jurídico completo.
- Pruebas finales typecheck/build, autonomía, consentimiento, UI/SEO y PWA según cambios.

## Publicación y comprobación pública, aún no autorizadas

- Conectar dominio/DNS/HTTPS y comprobar proyecto, variables y versión desplegada sin exponer secretos.
- No usar redirecciones del dominio anterior sin comprobar titularidad, control y alcance legal.
- Comprobar uso real completo, estados de carga/error/vacío y enlaces de navegación.
- Verificar PostHog 250159 con un protocolo autorizado de identificación y exclusión de pruebas; nunca confundir recepción simulada con ingestión real.
- Configurar o comprobar Search Console y sitemap del dominio nuevo. No prometer indexación inmediata.
- Comprobar iPhone físico cuando esté disponible; si no, mantener la limitación documentada.
- Solo después, actualizar perfiles/enlaces y preparar publicaciones para aprobación.

## Criterio de salida

El producto puede estar implementado y validado localmente sin estar relanzado. Marca, dominio, publicación y comprobaciones públicas siguen abiertos. La fecha objetivo del 30/10 no anula estos controles.

## Cierre del lote integral, 01/11/2026

Cerebro repitió typecheck y 18 pruebas de autonomía: PASS. Revisó diffs y adenda final; no repitió build ni suites de navegador de Claude. `.env.local` sintético ausente. Sin nuevas modificaciones de código ni publicación por Cerebro. Cierre documentado en Notion, Mandato actual.

Pendientes explícitos: prueba negativa automatizada de almacenamiento (estructura y valores), foco de paneles restantes, zoom, rendimiento controlado e iPhone físico. No se abre otra ronda de mejoras opcionales; priorizar respaldo y preparación de identidad/publicación. No afirmar seguridad o compatibilidad absolutas.
