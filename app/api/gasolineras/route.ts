import { NextResponse } from "next/server";
import { obtenerTodasEstaciones } from "@/lib/miteco";

export const dynamic = "force-dynamic";

// GET /api/gasolineras
// Proxy hacia MITECO — evita problemas de CORS en el cliente
export async function GET() {
  try {
    const gasolineras = await obtenerTodasEstaciones();
    return NextResponse.json({ ok: true, datos: gasolineras, total: gasolineras.length });
  } catch (error) {
    console.error("[API gasolineras]", error);
    return NextResponse.json(
      { ok: false, error: "No se pudieron obtener los datos de gasolineras" },
      { status: 500 }
    );
  }
}
