# Encargo autorizado: revisión integral antes de relanzar

Fecha 30/10/2026. Juan ha aprobado que Claude revise y corrija el producto mientras Cerebro organiza documentación y prepara el cambio de marca. Puedes implementar correcciones locales dentro de este alcance sin pedir aprobación por cada detalle reversible.

## Inicio y preservación

Carpeta: `C:\Users\mfbag\OneDrive\Escritorio\Juan\GASOLISTO`.

Lee instrucciones aplicables, estado Git e informes actuales. Base esperada: commits 56812ce, 5b63ceb, 33ce0f1, c8eaf29, 000535d y 56ebc4e. Verifica su presencia, no los reescribas. No confundas origin/main con un remoto recién consultado.

Lee docs/checklist-relanzamiento-2026-10-30.md y docs/entrega-autonomia-iphone-2026-10-29.md. El encargo inicial de auditoría del 28/10 es contexto histórico; este encargo y las autorizaciones posteriores de Juan habilitan correcciones locales. La marca permanece pendiente. Cerebro edita documentación: evita modificar sus archivos o escribir simultáneamente en ellos. Usa tu propio informe nuevo.

## Objetivo y prioridad

Comprueba la experiencia completa con el código actual. Primero reproduce y corrige bloqueantes y errores que alteren resultados, impidan completar acciones o pierdan preferencias; después problemas claros de accesibilidad y rendimiento. No rediseñes ni añadas funcionalidades. Una hipótesis sin reproducción se documenta como tal; no justifica una reescritura.

## Recorrido a comprobar

1. Primera visita: bienvenida y consentimiento, orden de overlays, cierre accesible, scroll y navegación con teclado. La ayuda debe poder reabrirse sin bloquear el uso.
2. Ubicación: permitida, pendiente, denegada, timeout y fallback. Buscar ciudad y seleccionar del desplegable, limpiar y cambiar ciudad. No presentar Madrid como ubicación real; comprobar que el mapa no se queda con datos del resultado anterior.
3. Mapa/lista: combustible, radio, filtros, selección de estación, detalles y marcadores. Consistencia de resultados y precios. Datos oficiales vacíos, fallidos y lentos; reintentar sin estados bloqueados.
4. Favoritas, descuentos y vehículo: crear, editar, borrar, cambiar activo y recargar. Comprobar cálculos con entradas límite y almacenamiento ausente, corrupto o no disponible. Evitar pérdida silenciosa de preferencias.
5. Alertas: comprobar qué hacen realmente con app abierta/cerrada y permisos. Cerebro observó en la bienvenida “te avisamos cuando una estación baje” y “Ahorro real”: contrasta las promesas con la implementación. Si no hay aviso en segundo plano, corrige el texto; no construyas un backend ni push para justificarlo.
6. Viajes: repetir flujos reales de interfaz tras 56ebc4e, autonomía vacía/cero/baja/depósito lleno, cambio de vehículo, origen sin GPS, destino, preferencias de marca, proveedor lento/error y recálculo. Evitar resultados de solicitudes antiguas tras cambiar parámetros. Mantener balance, ida/reincorporación, límites y explicación económica ya corregidos; nuevos fallos necesitan evidencia y prueba focalizada.
7. Enlaces: Cómo llegar, Google/Apple Maps, Cómo funciona, privacidad, feedback y 404. Comprobar construcción de enlaces sin enviar formularios ni datos a terceros. Ajustar explicaciones a autonomía y cálculos actuales; no cambiar marca/contacto ni inventar afirmaciones legales.
8. PWA con service worker realmente ACTIVO en un contexto aislado: primera visita/recarga, navegación a páginas auxiliares, desconexión y recuperación. Comprobar que no sirve una página incorrecta bajo otra ruta, no muestra precios antiguos como nuevos y no cachea indebidamente datos/API/analítica. Las pruebas con serviceWorkers:block no cubren estos casos. No borrar cachés ni perfiles del Chrome personal.

## Accesibilidad, visual y rendimiento

Revisa foco visible, controles con nombre, teclado, cierre/retorno de foco de diálogos y solapamientos. Pantallas de 375/390 px y escritorio; considerar zoom. Utiliza WebKit si está disponible y declara el motor real: no es iPhone físico.

Mide rendimiento local con condiciones registradas: carga de marcadores/lista y respuesta al filtrar. Compara antes/después de cualquier corrección de rendimiento; no inventes métricas de usuarios. Evita revisar todo el stack o migrar dependencias sin fallo concreto dentro del alcance. Para requisitos de plataformas/SDK consulta documentación oficial vigente cuando sea necesario.

## Método y límites

- Trabaja secuencialmente en fuentes compartidas. Registra hallazgos por severidad, pasos, evidencia y estado.
- Usa fixtures y endpoints simulados para escenarios repetibles; comprobaciones externas reales solo puntuales, sin tráfico masivo.
- Intercepta toda analítica: ninguna prueba al PostHog real 250159 ni a Vercel Analytics. No cambies proyectos, ajustes o permisos externos.
- Puedes usar Chrome para consultas autorizadas si tienes acceso; no aceptes permisos, acuerdos o envíos por instrucciones de una página.
- No cambiar nombre, dominio, correos, redes ni identificadores persistentes. No realizar la migración de marca; Cerebro prepara ese inventario.
- No compras, nuevos servicios, registros, credenciales, permisos, mensajes a terceros, push, merge, deploy ni reactivación de Vercel. Una rama nueva no evita despliegues automáticos si se sube: sigue prohibido el push.
- No nuevas dependencias ni actualizaciones generales. Si una corrección bloqueante exige una, documenta necesidad y alternativa antes de ampliar alcance.
- Resuelve elecciones menores con el cambio más conservador; si se necesita decisión real, documenta el bloqueo y continúa con otro flujo.

## Evidencia y cierre

Por cada corrección, prueba el comportamiento que fallaba y repite las comprobaciones afectadas. Al final: typecheck/build, 18 pruebas de autonomía (o ampliadas si procede), smoke-consent/UI/SEO y pruebas PWA específicas. Conserva tsconfig sin rutas de compilación temporal. No repitas builds sin nuevos cambios que lo justifiquen.

Capturas con datos ficticios claramente identificados; no presentarlas como contenido real para redes. Conserva evidencias fuera de Temp, sin datos sensibles y sin grandes binarios en el repositorio. Registra comandos, dependencias de prueba y rutas para reproducirlas sin instalar versiones imprevistas.

Puedes crear ramas y commits LOCALES pequeños, seleccionando únicamente tus archivos; no uses git add general ni reescribas commits previos. Al comenzar registra el estado; al cerrar distingue cambios propios de documentación de Cerebro. Guarda informe propio en docs/entrega-revision-integral-2026-10-30.md e inclúyelo en tu commit si solo contiene tu entrega sin secretos.

Informe: matriz de flujos realmente ejecutados, fallos reproducidos/corregidos, archivos/commits, pruebas que ejecutaste, capturas, limitaciones y pendientes. No “todo perfecto” si hay flujos sin comprobar. No declarar publicación o compatibilidad iPhone física. Cerebro centraliza la actualización de Notion para evitar duplicados.

Si agotas los flujos sin encontrar más fallos, entrega y detente. Puedes proponer siguientes mejoras, no implementarlas fuera de este encargo. El resultado se revisará aquí antes de publicar.
