import type { Coordenadas, Gasolinera } from "@/types";

export interface PlanViaje {
  origen: Coordenadas;
  destino: string;
  destinoCoordenadas: Coordenadas;
  distanciaKm: number;
  rutaCoordenadas: Coordenadas[];
  paradas: ParadaRepostaje[];
  // Resumen económico: tres cifras distintas, ninguna cuenta el mismo
  // concepto dos veces. Son estimaciones sobre datos actuales, no una
  // medición ni una garantía.
  // 1) Coste de combustible de TODO el trayecto (incluidos los desvíos de
  //    las paradas) al precio de referencia (media) actual.
  costeCombustibleEstimado: number;
  // 2) Importe real de repostar en las paradas recomendadas, a su propio
  //    precio — no es el coste del viaje completo.
  importeRepostajes: number;
  // 3) Ahorro de esas paradas frente al precio de referencia, ya neto del
  //    combustible de cada desvío (no se resta el desvío otra vez).
  ahorroEstimadoParadas: number;
  // Autonomía restante que introdujo el usuario para este cálculo (no la
  // autonomía máxima del vehículo con depósito lleno).
  autonomiaRestanteKm: number;
  // Fracción de la autonomía disponible que se reserva como colchón antes
  // de buscar una parada obligatoria (p.ej. 0.15 = no se cuenta el último
  // 15% de autonomía como alcanzable). Informativo para la interfaz.
  margenReserva: number;
  // Avisos no bloqueantes sobre limitaciones del propio cálculo de un plan
  // que SÍ llega a completarse (datos de ruta escasos, geometría reescalada
  // frente a la distancia total del proveedor, etc.). Si el plan no puede
  // completarse (sin candidatas, sin verificar, presupuesto agotado, fallo
  // del proveedor, o límite de paradas sin llegar al destino),
  // planificarViaje lanza un error distinguible en vez de devolver un
  // PlanViaje — estos avisos nunca sustituyen a ese error.
  avisos: string[];
}

export interface ParadaRepostaje {
  gasolinera: Gasolinera;
  kmDesdeOrigen: number;
  litrosARepostar: number;
  costeRepostaje: number;
  motivoPausa: "autonomia" | "precio_optimo";
  // Desvío real de ida MÁS vuelta/reincorporación (km), verificado por
  // carretera para ambos sentidos por separado — nunca asumido simétrico.
  // Toda parada del plan tiene este dato confirmado: una candidata cuya
  // ida o vuelta no se pudo verificar nunca llega a convertirse en parada.
  desvioKm: number;
  // Ahorro estimado frente al precio de referencia del combustible en los
  // datos actuales, descontado el combustible adicional que cuesta el
  // desvío real. Puede ser negativo: una parada puede ser necesaria para
  // no quedarse sin combustible aunque no compense económicamente frente a
  // la referencia. Es la MEJOR opción entre las candidatas comprobadas por
  // carretera en este tramo, nunca se presenta como "ahorro real" ni la
  // estación como "óptima" en términos absolutos.
  ahorroNetoEstimado: number;
  // Autonomía resultante justo tras repostar en esta parada (antes de
  // descontar la reincorporación a la ruta), a partir del balance real:
  // combustible que quedaba al llegar + lo repostado (limitado a la
  // capacidad libre del depósito), nunca reiniciado al depósito lleno.
  autonomiaTrasRepostarKm: number;
}
