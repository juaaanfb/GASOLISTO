// Envoltorio fino sobre posthog.capture para las acciones de producto (no
// pageviews, esos ya los gestiona PostHogProvider). Nunca debe romper la
// UI: si PostHog no está configurado (falta la env var, como en local) o
// el navegador bloquea el script, capture() simplemente no hace nada — se
// pierde el evento, no la interacción del usuario.
//
// Restricción de privacidad para todo lo que se llame desde aquí: nunca
// texto libre completo (búsquedas, origen/destino de viaje) ni coordenadas
// exactas. Solo longitudes, buckets y categorías ya definidas.
export function track(evento: string, propiedades?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  void import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.capture(evento, propiedades);
    })
    .catch(() => {});
}

// Bucket de distancia a una gasolinera concreta, en vez de la distancia
// exacta (que junto al resto de propiedades podría acabar revelando la
// ubicación real del usuario con precisión excesiva para analítica).
export function bucketDistanciaEstacion(km: number | undefined): string {
  if (km === undefined) return "unknown";
  if (km < 2) return "0_2";
  if (km < 5) return "2_5";
  if (km < 10) return "5_10";
  if (km < 20) return "10_20";
  return "20_plus";
}

// Bucket de distancia total de una ruta planificada (rangos más amplios:
// aquí lo relevante es el tipo de trayecto — urbano/corto vs. viaje largo
// — no un kilometraje preciso).
export function bucketDistanciaRuta(km: number): string {
  if (km < 50) return "0_50";
  if (km < 150) return "50_150";
  if (km < 300) return "150_300";
  return "300_plus";
}

// Representación como string del radio de búsqueda (RadioBusqueda incluye
// null = "sin límite"), para no enviar `null` como valor de propiedad.
export function radioComoTexto(radio: number | null): string {
  return radio === null ? "sin_limite" : String(radio);
}
