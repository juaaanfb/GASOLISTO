import { NextResponse } from "next/server";
import { obtenerTodasEstaciones } from "@/lib/miteco";

export const dynamic = "force-dynamic";

const CDN_FRESH_SECONDS = 5 * 60;
const CDN_STALE_SECONDS = 60 * 60;

const SUCCESS_HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Vercel-CDN-Cache-Control": `public, s-maxage=${CDN_FRESH_SECONDS}, stale-while-revalidate=${CDN_STALE_SECONDS}`,
};

const ERROR_HEADERS = {
  "Cache-Control": "no-store",
};

// GET /api/gasolineras
// Proxy hacia MITECO — evita problemas de CORS en el cliente
export async function GET() {
  try {
    const gasolineras = await obtenerTodasEstaciones();
    return NextResponse.json(
      { ok: true, datos: gasolineras, total: gasolineras.length },
      { headers: SUCCESS_HEADERS }
    );
  } catch (error) {
    console.error("[API gasolineras]", error);
    return NextResponse.json(
      { ok: false, error: "No se pudieron obtener los datos de gasolineras" },
      { status: 500, headers: ERROR_HEADERS }
    );
  }
}
