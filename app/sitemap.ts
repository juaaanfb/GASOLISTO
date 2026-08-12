import type { MetadataRoute } from "next";

const SITE_URL = "https://gasolisto.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 1,
    },
  ];
}
