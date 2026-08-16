// Dominio real y estable del proyecto en Vercel. Deliberadamente NO se usa
// process.env.VERCEL_URL: esa variable apunta a la URL de cada despliegue
// individual (gasolisto-xxxxx.vercel.app), no al dominio público fijo, lo
// que rompería las URLs canónicas y las tarjetas de OG/Twitter.
// Centralizado aquí (en vez de repetido en layout/robots/sitemap) porque
// cambiará el día que el dominio propio esté listo.
export const SITE_URL = "https://gasolisto.com";

export const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/1Le1pWdBLZYjhxNn82aZBAjWhg2HJoEJlA4Oq3r-E1qw/viewform";
