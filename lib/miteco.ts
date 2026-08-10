import type { Gasolinera, MitecoRespuesta, MitecoEstacion, PreciosCombustible } from "@/types";

const URL_BASE =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

// Convierte el formato español de número ("1,459") a float
function parsePrecio(valor: string): number | undefined {
  if (!valor || valor.trim() === "") return undefined;
  const num = parseFloat(valor.replace(",", "."));
  return isNaN(num) ? undefined : num;
}

// Convierte el formato español de coordenadas ("40,416775") a float
function parseCoordenada(valor: string): number {
  return parseFloat(valor.replace(",", "."));
}

// Mapea una estación MITECO al modelo interno de la app
function mapearEstacion(est: MitecoEstacion, fecha: string): Gasolinera {
  const precios: PreciosCombustible = {};

  const g95 = parsePrecio(est["Precio Gasolina 95 E5"]);
  const g95p = parsePrecio(est["Precio Gasolina 95 E5 Premium"]);
  const g98 = parsePrecio(est["Precio Gasolina 98 E5"]);
  const g98e10 = parsePrecio(est["Precio Gasolina 98 E10"]);
  const die = parsePrecio(est["Precio Gasoleo A"]);
  const dieB = parsePrecio(est["Precio Gasoleo B"]);
  const diePrem = parsePrecio(est["Precio Gasoleo Premium"]);
  const glp = parsePrecio(est["Precio Gases licuados del petróleo"]);
  const gnc = parsePrecio(est["Precio Gas Natural Comprimido"]);
  const gnl = parsePrecio(est["Precio Gas Natural Licuado"]);

  if (g95 !== undefined) precios.gasolina95 = g95;
  if (g95p !== undefined) precios.gasolina95Premium = g95p;
  if (g98 !== undefined) precios.gasolina98 = g98;
  if (g98e10 !== undefined) precios.gasolina98E10 = g98e10;
  if (die !== undefined) precios.diesel = die;
  if (dieB !== undefined) precios.dieselB = dieB;
  if (diePrem !== undefined) precios.dieselPremium = diePrem;
  if (glp !== undefined) precios.glp = glp;
  if (gnc !== undefined) precios.gnc = gnc;
  if (gnl !== undefined) precios.gnl = gnl;

  return {
    id: est.IDEESS,
    nombre: est.Rótulo || est.Dirección,
    direccion: est.Dirección,
    localidad: est.Localidad,
    provincia: est.Provincia,
    codigoPostal: est["C.P."],
    latitud: parseCoordenada(est.Latitud),
    longitud: parseCoordenada(est["Longitud (WGS84)"]),
    horario: est.Horario,
    precios,
    ultimaActualizacion: fecha,
  };
}

// Obtiene todas las estaciones terrestres de España
export async function obtenerTodasEstaciones(): Promise<Gasolinera[]> {
  const respuesta = await fetch(URL_BASE, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!respuesta.ok) {
    throw new Error(`Error MITECO: ${respuesta.status} ${respuesta.statusText}`);
  }

  const datos: MitecoRespuesta = await respuesta.json();

  if (datos.ResultadoConsulta !== "OK") {
    throw new Error(`MITECO devolvió error: ${datos.ResultadoConsulta}`);
  }

  return datos.ListaEESSPrecio
    .map((est) => mapearEstacion(est, datos.Fecha))
    .filter((g) => !isNaN(g.latitud) && !isNaN(g.longitud));
}
