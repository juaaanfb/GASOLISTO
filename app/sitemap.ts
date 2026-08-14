import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      // Los precios se refrescan en cada visita, así que aquí sí tiene
      // sentido declarar la fecha de generación del sitemap como "última
      // modificación".
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 1,
    },
    {
      // Contenido estático: se declara la fecha real del último cambio de
      // contenido en vez de "ahora mismo" en cada build, que es una señal
      // de frescura poco honesta para páginas que no han cambiado.
      url: `${SITE_URL}/como-funciona`,
      lastModified: new Date("2026-08-12"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/privacidad`,
      lastModified: new Date("2026-08-12"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
