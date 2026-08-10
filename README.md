# Gasolisto

Comparador de precios de gasolineras en España. Datos en tiempo real de la API pública del MITECO, sin necesidad de cuenta ni clave de API.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Build de producción

```bash
npm run build
npm start
```

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Leaflet / OpenStreetMap (mapa)
- OSRM (rutas) + Nominatim (geocodificación)
- API pública del MITECO (precios de carburantes)
- PWA instalable (manifest + service worker en `public/sw.js`)
- Sin backend: favoritas, alertas y vehículos se guardan en `localStorage`

## Desplegar en Vercel (gratis)

1. Crear cuenta gratuita en https://vercel.com (puede ser con GitHub).
2. Opción A — CLI (más rápido, sin subir el código a GitHub):
   ```bash
   npx vercel login
   npx vercel --prod
   ```
   Ejecutar ambos comandos dentro de esta carpeta (`GASOLISTO/`). `vercel login` abrirá el navegador para confirmar la cuenta.
3. Opción B — GitHub:
   - Crear un repositorio en GitHub y subir este proyecto (`git remote add origin <url> && git push -u origin main`).
   - En vercel.com → "Add New Project" → importar ese repositorio → Deploy (detecta Next.js automáticamente, sin configuración adicional).

No hace falta configurar variables de entorno: la API del MITECO es pública y no requiere clave.
