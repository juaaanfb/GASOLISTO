import type { Coordenadas, Gasolinera } from "@/types";

export interface PlanViaje {
  origen: Coordenadas;
  destino: string;
  destinoCoordenadas: Coordenadas;
  distanciaKm: number;
  rutaCoordenadas: Coordenadas[];
  paradas: ParadaRepostaje[];
  // Coste y ahorro del viaje completo, no solo de las paradas: litros que
  // consume el vehículo en toda la ruta al precio de referencia (media) y
  // frente al precio máximo del radio. Son estimaciones sobre datos
  // actuales, no una medición ni una garantía.
  ahorroEstimado: number;
  costeEstimado: number;
  // Autonomía restante que introdujo el usuario para este cálculo (no la
  // autonomía máxima del vehículo con depósito lleno).
  autonomiaRestanteKm: number;
  // Fracción de la autonomía disponible que se reserva como colchón antes
  // de buscar una parada obligatoria (p.ej. 0.15 = no se cuenta el último
  // 15% de autonomía como alcanzable). Informativo para la interfaz.
  margenReserva: number;
  // Avisos no bloqueantes sobre limitaciones del propio cálculo (datos de
  // ruta escasos, límite de paradas alcanzado, etc.). No son errores: el
  // plan se devuelve igualmente, pero no debe presentarse como validado
  // sin mostrar estos avisos.
  avisos: string[];
}

export interface ParadaRepostaje {
  gasolinera: Gasolinera;
  kmDesdeOrigen: number;
  litrosARepostar: number;
  costeRepostaje: number;
  motivoPausa: "autonomia" | "precio_optimo";
  // Desvío estimado de ida y vuelta (km) entre la ruta y la gasolinera,
  // verificado por carretera (no en línea recta) hasta donde el
  // presupuesto de peticiones lo permite; ver limitaciones en el informe.
  desvioKm: number;
  // Ahorro estimado frente al precio medio del combustible en los datos
  // actuales, descontado el combustible adicional que cuesta el desvío.
  // Puede ser negativo: una parada puede ser necesaria para no quedarse
  // sin combustible aunque no compense económicamente frente a la media.
  // Nunca se presenta como "ahorro real" ni la estación como "óptima".
  ahorroNetoEstimado: number;
  // Autonomía resultante justo tras repostar en esta parada (antes de
  // descontar el regreso a la ruta), según lo repostado realmente, no el
  // depósito lleno.
  autonomiaTrasRepostarKm: number;
}
