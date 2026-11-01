# Inventario para futuro cambio de marca

30/10/2026. Inspección de fuentes locales por Cerebro. No se ha sustituido ningún nombre ni modificado la aplicación. Candidatos pendientes; documento preparatorio, no autorización de compra o migración.

## Superficies verificadas en el código

| Superficie | Archivos | Actuación futura |
|---|---|---|
| Nombre visible, accesibilidad y presentación | app/page.tsx, components/onboarding/WelcomeModal.tsx, app/not-found.tsx | Revisar textos y etiquetas accesibles, no solo encabezados |
| Explicación y contacto | app/como-funciona/page.tsx, app/privacidad/page.tsx | Nombre, metadata, FAQ visible/JSON-LD, mailto; validar contacto antes de cambiar |
| SEO y dominio | lib/site.ts, app/layout.tsx, app/robots.ts, app/sitemap.ts | SITE_URL alimenta URLs; comprobar todos los consumidores, canonical y tarjetas. No sustituir por URL efímera de deployment |
| Instalación PWA | app/manifest.ts, public/sw.js | Nombre/short_name, identificadores, cachés y comportamiento de actualización |
| Imágenes y generación | public/icons/og-image.png, icon-192.png, icon-512.png, favicon-32.png, apple-touch-icon.png; scripts/gen-icons.mjs, lib/icon-art.tsx | Inspección visual pendiente: existencia de archivos no prueba que lleven texto antiguo |
| Clases visuales internas | app/globals.css, components/map/MapView.tsx | gasolisto-tooltip: conservar compatibilidad o cambiar CSS y consumidores juntos; no confundir con identidad pública |
| Paquete y documentación | package.json, package-lock.json, README.md, docs/ | Identidad de paquete y documentación operativa; conservar historia de decisiones y commits |
| Pruebas | scripts/smoke-ui.cjs, smoke-seo.cjs, smoke-consent.cjs | Textos, dominios, email esperado y claves de almacenamiento: cambiar junto al producto, sin debilitar aserciones |

## Estado local que requiere decisión, no sustitución global

- Vehículos: hooks/useVehiculo.ts, claves gasolisto_vehiculos y gasolisto_vehiculo_activo.
- Favoritas: hooks/useFavoritas.ts, gasolisto_favoritas.
- Descuentos: hooks/useDescuentos.ts, gasolisto_descuentos.
- Alertas/resumen: hooks/useAlertas.ts, gasolisto_alertas y gasolisto_resumen_diario.
- Bienvenida: components/onboarding/WelcomeModal.tsx y scripts, gasolisto_onboarding_visto.
- Pista del mapa: app/page.tsx, gasolisto_hint_mapa_visto.
- Consentimiento: lib/analytics-consent.ts, gasolisto_analytics_consent_v1 y evento gasolisto-analytics-consent.
- Service worker: public/sw.js, gasolisto-v1 y cachés derivadas.

Las claves antiguas son identificadores internos: renombrarlas sin migración puede hacer desaparecer preferencias. Un dominio nuevo tiene otro origen y no obtiene automáticamente el localStorage ni las cachés del dominio anterior. No afirmar que una migración de clave dentro de un origen transfiere datos entre dominios. Evitar trasladar consentimiento silenciosamente; decidir comportamiento conforme al contexto real.

## Servicios externos y contenido: pendientes de comprobación específica

| Recurso | Referencia conocida | Pendiente |
|---|---|---|
| GitHub | juaaanfb/GASOLISTO | Confirmar copia remota, flujos y efectos de renombrar; no es necesario renombrar repositorio para cambiar nombre público |
| Vercel | Proyecto gasolisto/gasolisto | Pausa, dominios, Git previews, variables y producción antes de cualquier push o cambio |
| PostHog | EU 250159 | Dominios/filtros/dashboards/URLs, preservar historia, no duplicar proyecto ni enviar pruebas sin autorización |
| Search Console | sc-domain:gasolisto.com | Nueva propiedad/autorización para dominio final; nada prueba control actual del anterior |
| Google Forms | lib/site.ts: FEEDBACK_FORM_URL, formulario 1Le1pWdBLZYjhxNn82aZBAjWhg2HJoEJlA4Oq3r-E1qw | Título, descripción, publicación, acceso sin login y enlaces; no se ha abierto en esta revisión |
| Correo | contacto.gasolisto@gmail.com | Juan debe elegir o confirmar contacto nuevo; conservar mientras no exista alternativa autorizada |
| Redes | X histórico @GasolistoES; LinkedIn según cuenta ya utilizada | Confirmar cuenta, disponibilidad de nuevos identificadores, bios, enlace, posts fijados y capturas |
| Notion | Mandato actual, roadmap, decisiones y documentación técnica existentes | Actualizar contexto actual, conservar hechos e historial; no reemplazar indiscriminadamente menciones históricas |

No hay confirmación actual de disponibilidad de handles, control del dominio anterior, configuración externa ni libertad jurídica de marca. No se han leído secretos ni alterado credenciales.
