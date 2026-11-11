# Optimización de imágenes guardadas

Aplicada el 11 de noviembre de 2026 al proyecto de Supabase utilizado por el catálogo, con autorización explícita para la migración y la actualización de referencias.

## Resultado medido

| Medida | Antes | Después |
| --- | ---: | ---: |
| Fotos principales | 162 | 162 |
| Peso conjunto de fotos principales | 28.366.180 bytes | 18.335.598 bytes |
| Miniaturas | 0 | 162 |
| Peso conjunto de miniaturas | — | 5.266.104 bytes |
| Imágenes de las 12 tarjetas de la primera página | 1.141.062 bytes | 248.134 bytes |

Las fotos principales pesan un **35,4% menos**. En la primera página, usar las miniaturas reduce los bytes de imágenes un **78,3%**. Es una comparación del contenido binario de esas mismas fotos, no una promesa de ahorro mensual ni una medición del tiempo de carga de un navegador.

Se recomprimieron 93 fotos. Se conservaron sin recomprimir 69 archivos que ya eran livianos o no justificaban una pérdida adicional de calidad. De las fotos grandes, 25 pasaron a un lado mayor de 1280 píxeles; las demás conservaron sus dimensiones. Las miniaturas tienen un lado mayor de hasta 640 píxeles y no se ampliaron imágenes pequeñas.

## Equilibrio entre peso y calidad

Cada candidata se generó desde el archivo original, evitando recomprimir una candidata anterior. Se probaron distintas calidades WebP y se aceptaron cambios con ahorro claro y SSIM mínimo de 0,985. Las fotos grandes se compararon con el original a un tamaño de visualización de hasta 800 píxeles; las miniaturas, contra una referencia de hasta 640 píxeles.

El SSIM mínimo obtenido fue 0,98846 en principales y 0,98550 en miniaturas. Este índice no equivale a un porcentaje garantizado de calidad visual. Se revisó además una comparación de cuatro fotos pesadas. Los objetivos de 120 KB y 40 KB se trataron como preferencias: las imágenes con muchos detalles pueden superar esos pesos para conservarlos.

Las exigencias de subida siguen iguales: formatos existentes, originales de hasta 50 MB y límite histórico de 5 MB para el archivo convertido. La compresión se realiza antes de guardar. Las miniaturas de futuras cargas se generan desde el original para evitar una segunda generación de compresión.

## Conservación y seguridad

- Se subieron copias con rutas UUID nuevas, sin sobrescribir los originales.
- Se verificaron los 255 objetos nuevos antes de modificar las referencias.
- La actualización de las 162 referencias fue transaccional y comprobó que cada ruta y revisión siguiera coincidiendo con el inventario.
- Se conservan físicamente los 162 originales. Los reemplazados ya no pueden obtener una firma nueva de manera anónima.
- El bucket sigue privado y la función de lectura sigue siendo `SECURITY INVOKER`, respetando RLS.
- Se verificaron por HTTP los hashes SHA-256 de las 162 fotos activas y sus 162 miniaturas: las 324 coincidieron con los archivos preparados.
- Pasaron las comprobaciones reales de paginación, filtros, productos ocultos y variantes inexistentes. El advisor de seguridad conserva únicamente la advertencia anterior de protección contra contraseñas filtradas desactivada; no se modificó Auth.
- Se retiraron las 254 copias de prueba que el CLI había colocado en una carpeta duplicada, después de comprobar sus rutas, tamaños y ausencia de referencias. No se retiraron originales ni archivos activos.

El bucket ocupa 47.476.942 bytes en 417 objetos porque conserva los respaldos. La reducción de peso de las imágenes activas no equivale a liberar ese espacio mientras se mantengan los originales. No se ejecutó la limpieza de respaldos; revisar el manifiesto antes de usar la cola de limpieza del panel.

## Migración, activación y reversión

Se aplicó `supabase/migrations/20261111161125_miniaturas_privadas_productos.sql`. El nombre local se alineó con la versión registrada por Supabase. La migración agrega `thumbnail_path`, valida ambos archivos, aplica las mismas condiciones de lectura a las miniaturas y protege los archivos referenciados contra sobrescritura y borrado.

El código activa las miniaturas por defecto; `VITE_PRODUCT_THUMBNAILS=false` permite volver a usar las fotos principales. La activación debe publicarse después de la migración, que ya está aplicada. Las 105 pruebas locales y la compilación pasan.

El respaldo y los manifiestos de esta operación están en `.image-backfill.local/`, excluido de Git:

- `originals/`: archivos descargados antes de modificar las referencias.
- `plan.json`: rutas anteriores y nuevas, dimensiones, tamaños, hashes y métricas.
- `verification.json` y `catalog-verification.json`: verificaciones remotas.
- `apply.sql.local` y `rollback.sql.local`: actualización y reversión acotadas a este lote.

La reversión debe comprobar que las referencias no hayan cambiado desde esta operación. El script preparado también contempla retirar de la cola de limpieza las rutas originales antes de restaurarlas. No hay que eliminar la columna ni borrar archivos para revertir la presentación.

Las herramientas de preparación son de solo lectura remota y usan dependencias temporales fuera de la aplicación. Los scripts no vuelven a preparar el lote si encuentran su marcador `applied.json`. El CI y las compilaciones no ejecutan esta operación ni aplican migraciones.
