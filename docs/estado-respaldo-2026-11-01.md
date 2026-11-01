# Estado del respaldo — 01/11/2026

Cerebro Central comprobó el remoto con git ls-remote: main sigue en d454657, master en 6e5b486. La rama local lote4-revision-integral está en 3f5fa11 y contiene 19 commits posteriores a main. No están aún respaldados como rama en GitHub en esta operación.

## Respaldo creado y verificado

Directorio principal: `C:\Users\mfbag\.codex\backups\gasolisto\2026-11-01-121308`.

Directorio adicional preparado para OneDrive: `C:\Users\mfbag\OneDrive\Escritorio\Juan\RESPALDOS_GASOLISTO\2026-11-01-121308`.

- historial.bundle: historial Git y referencias; git bundle verify correcto; clonado en prueba-restauracion.git y git fsck --full correcto. SHA de la rama restaurada coincide con HEAD original.
- archivos-y-documentacion.zip: 86 archivos del árbol de trabajo, incluida documentación sin commit. Comparación de cada archivo del ZIP con inventario SHA256: PASS.
- Segunda copia: hashes coincidentes. No se ha verificado su sincronización en la nube de OneDrive.
- inventario-sha256.json, paquete-sha256.json, estado-pendiente.txt y LEEME-RECUPERACION.txt acompañan el paquete.
- No incluye node_modules, builds, .vercel, .env ni credenciales externas. El bundle contiene historial; no debe compartirse públicamente sin revisión.
- No protege preferencias del navegador, datos de servicios externos ni secretos. No se borró ni movió ningún archivo original.

El paquete captura el estado anterior a la creación de este informe y del encargo de respaldo remoto. Estos documentos de cierre no forman parte del ZIP original.

## Vercel y límite de esta ejecución

Conector get_project: live:false; último deployment mostrado READY. Esa combinación no acredita que los pushes no creen previews. No se han modificado configuración remota, permisos ni conexiones. No hubo push, merge ni deploy.

Fuente oficial consultada: https://vercel.com/docs/project-configuration/git-configuration y https://vercel.com/docs/git. Vercel permite desactivar autodespliegues mediante git.deploymentEnabled:false; la configuración todavía NO se ha aplicado por Cerebro, respetando el reparto de desarrollo con Claude.

## Siguiente acción

Encargo acotado listo: docs/encargo-claude-respaldo-github-sin-deploy-2026-11-01.md. Claude verifica protecciones y guarda documentación antes de subir solo una rama de respaldo. No dar GitHub por actualizado hasta verificar SHA remoto y ausencia de deployment.

Nombre y dominio siguen pendientes. Ninguna investigación de marca anterior equivale a garantía jurídica.
