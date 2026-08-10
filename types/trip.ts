import type { Coordenadas, Gasolinera } from "@/types";

export interface PlanViaje {
  origen: Coordenadas;
  destino: string;
  destinoCoordenadas: Coordenadas;
  distanciaKm: number;
  rutaCoordenadas: Coordenadas[];
  paradas: ParadaRepostaje[];
  ahorroEstimado: number;
  costeEstimado: number;
}

export interface ParadaRepostaje {
  gasolinera: Gasolinera;
  kmDesdeOrigen: number;
  litrosARepostar: number;
  costeRepostaje: number;
  motivoPausa: "autonomia" | "precio_optimo";
}
