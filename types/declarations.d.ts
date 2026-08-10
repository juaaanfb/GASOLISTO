// Permite importar archivos CSS como módulos (necesario para Leaflet en Next.js)
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
