# Revisión de UX y SEO

## Cambios aplicados

- Corrección de identidad visual solicitada: fondos blancos, celeste original `#bce8f7`, texto `#17323b` y acentos turquesa compatibles con el logo. Se retiraron los fondos crema y verdes del tema. Las pruebas comprueban los colores principales y el contraste.

- Paginación pública con enlaces reales y URLs que conservan búsqueda y categoría. Las páginas siguientes tienen título y URL canónica propios. El cambio de página lleva el foco al título del catálogo; la búsqueda no mueve el foco del campo.
- Botón «Limpiar filtros» disponible también cuando hay resultados. Los estados vacíos explican qué hacer y permiten volver a la primera página o consultar por una idea.
- Categorías cargadas independientemente de los productos: escribir o paginar no borra sus opciones ni vuelve a descargarlas. Si falla esa consulta, los productos siguen visibles y se puede reintentar solo la carga de categorías.
- Enlace «Ver todo el catálogo» junto a Destacados. Se conserva el inicio sin categorías, la frase elegida y la eliminación del botón «Hablemos de tu idea».
- Una etiqueta canónica por página, usando `VITE_SITE_URL` cuando está configurado y el origen actual en caso contrario. Se excluyen parámetros de seguimiento; se normalizan la primera página y los parámetros inválidos. La URL social utiliza esa misma dirección.
- Búsquedas y filtros con `noindex,follow`; carrito, administración y páginas inexistentes conservan `noindex`. Las búsquedas no se bloquean mediante robots.txt, para permitir que el rastreador lea la directiva.
- Cabeceras `X-Robots-Tag` para carrito y administración en `vercel.json`. Están preparadas para el próximo despliegue; no se verificaron contra un alojamiento remoto.
- Título del inicio que identifica el servicio y la localidad, descripciones de respaldo para productos con texto vacío y prioridad alta para la foto principal de la ficha.
- La URL se corrige cuando Supabase confirma que la página pedida quedó fuera de rango y devuelve la primera. Las rutas y las reglas de consulta no cambian.

## Verificación

`npm test`: 88 pruebas aprobadas, 0 fallas. Se añadieron comprobaciones de canonical único, paginación, conservación y limpieza de filtros, recuperación independiente de categorías, normalización de páginas inexistentes y cabeceras de indexación.

`npm run build`: compilación de producción comprobada. Persiste la advertencia conocida del conversor HEIC, que se carga bajo demanda.

No se cambiaron datos, permisos, credenciales, validaciones ni servicios de Supabase. Las cabeceras del alojamiento deben comprobarse después de publicar esta versión.

## Límites

La aplicación sigue siendo una SPA. Los títulos, las fichas y las etiquetas canónicas se completan con JavaScript; no se implementó SSR ni prerenderizado. Los robots que no ejecutan JavaScript y las vistas previas sociales individuales siguen recibiendo el HTML general de la marca. No se asignó una URL canónica de inicio a todas las rutas en el HTML estático, porque sería incorrecta para las fichas y páginas del catálogo.

No se inventó un dominio para generar un sitemap ni se añadieron reseñas, garantías o datos estructurados ficticios. Para una revisión de indexación real se necesita el dominio publicado y Search Console. No se midieron Core Web Vitals ni se garantiza una posición en buscadores.

## Referencias

- [Google: SEO de JavaScript y etiquetas canónicas](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).
- [Google: paginación y enlaces entre páginas](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading).
- [Google: directiva noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing).
- [Vercel: cabeceras en la configuración del proyecto](https://vercel.com/docs/project-configuration/vercel-json#headers).
