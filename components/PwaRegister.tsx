"use client";
import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    // Solo en producción: en dev, el cache-first de /_next/static/ sirve
    // JS obsoleto tras cada cambio y rompe el hot reload.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
