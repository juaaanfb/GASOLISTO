import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Quita acentos y pasa a minúsculas para comparar texto de forma tolerante
// (p.ej. "Móstoles" debe coincidir buscando "mostoles").
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Une partes de dirección evitando comas duplicadas o colgantes. El campo
// "Dirección" del MITECO a veces trae segmentos vacíos entre comas (p.ej.
// "CALLE JOSE PAULETE, " cuando falta el número), que al concatenar con la
// localidad producía "CALLE JOSE PAULETE, , MADRID".
export function formatDireccion(...partes: (string | null | undefined)[]): string {
  return partes
    .flatMap((p) => (p ?? "").split(","))
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}
