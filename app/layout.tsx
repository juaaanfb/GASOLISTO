import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

// Dominio real y estable del proyecto en Vercel. Deliberadamente NO se usa
// process.env.VERCEL_URL: esa variable apunta a la URL de cada despliegue
// individual (gasolisto-xxxxx.vercel.app), no al dominio público fijo, lo
// que rompía las URLs canónicas y las tarjetas de OG/Twitter.
const SITE_URL = "https://gasolisto.vercel.app";
const TITULO = "Gasolisto — Precios de gasolina y diésel baratos cerca de ti";
const DESCRIPCION =
  "Encuentra la gasolinera más barata cerca de ti. Precios reales y actualizados de gasolina 95, 98, diésel y GLP en toda España, con calculadora de ahorro y planificador de viajes.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITULO,
  description: DESCRIPCION,
  keywords: [
    "gasolina barata",
    "precio gasolina",
    "gasolineras cerca de mí",
    "precio diésel",
    "comparador gasolineras",
    "ahorrar gasolina",
  ],
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gasolisto",
  },
  openGraph: {
    title: TITULO,
    description: DESCRIPCION,
    url: "/",
    siteName: "Gasolisto",
    locale: "es_ES",
    type: "website",
    images: [{ url: "/icons/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRIPCION,
    images: ["/icons/og-image.png"],
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Gasolisto",
  url: SITE_URL,
  description: DESCRIPCION,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any (PWA)",
  inLanguage: "es-ES",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
  areaServed: {
    "@type": "Country",
    name: "España",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#16a34a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body className="antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
