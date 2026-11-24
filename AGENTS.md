# Contexto para trabajar en Mostacho 3D

Actualizado el 24 de noviembre de 2026. Este archivo conserva contexto del proyecto para futuras sesiones de IA; comprobar siempre el estado real del repositorio antes de editar.

## Proyecto y flujo de trabajo

- Catálogo de impresión 3D de Mostacho 3D, en San Miguel de Tucumán, Tucumán, Argentina. Idioma: español rioplatense.
- SPA con React, React Router y Vite. Supabase provee catálogo, Auth y Storage. Alojamiento configurado para Vercel.
- Repositorio: https://github.com/Santhomas1/catalogo_mostacho, rama principal `main`.
- Revisar `git status`, cambios locales y remoto antes de integrar. Conservar los cambios de SEO, sitemap y ubicación incorporados en GitHub. No forzar pushes.
- Subir a GitHub y verificar el despliegue son resultados distintos. No afirmar que el sitio publicado está actualizado sin comprobar el despliegue.
- Usar las habilidades disponibles de implementación/verificación y Supabase cuando correspondan.

## Decisiones actuales de interfaz

- Conservar la identidad blanca y celeste, el logo y la tipografía existente.
- Base de controles tipo shadcn/Radix; iconos de `lucide-react` ya instalado.
- El usuario pidió ideas de Magic UI y Lucide; Aceternity UI quedó como alternativa opcional.
- `src/styles/atelier.css` adapta ideas de Dot Pattern, Shimmer y Border Beam mediante CSS propio; no instala Magic UI ni añade dependencias de animación.
- Los efectos de entrada duran menos de cinco segundos, se ejecutan una vez y respetan `prefers-reduced-motion`. Evitar efectos pesados o consultas adicionales por decoración.
- El inicio incorpora puntos, destello del botón, detalle de borde, iconos de impresión y pasos de trabajo. El catálogo tiene un indicador visual en las fotos al pasar el cursor y un foco visible para teclado; el fondo de puntos permanece en el inicio.
- El texto SEO del inicio y los datos de ubicación centralizados en `src/lib/business.js` deben conservarse al modificar la presentación.

## Google Maps

- `src/components/GoogleReviewCard.jsx` muestra la invitación a dejar una reseña al final del inicio.
- El enlace real está en `business.googleReviews`: https://maps.app.goo.gl/dYquoWQELrKEr5PG9.
- El usuario decidió dejar para más adelante mostrar automáticamente las cinco mejores reseñas. No hay una integración activa con una API de reseñas ni credenciales de Google configuradas por esta tarea.
- No inventar estrellas, puntuaciones, autores, testimonios ni cantidad de reseñas.
- Si se retoma la integración, verificar la documentación vigente: Places devuelve hasta cinco reseñas por relevancia; Business Profile permite consultar reseñas del perfil autorizado y ordenarlas por puntuación. Esta última requiere acceso y autorización de Google.

## Optimización de Supabase

- El cliente público aislado está en `src/lib/supabase.js`; la configuración del servicio compartido, en `src/services/catalog.js`.
- Listados: caché en memoria de 30 segundos. Categorías: 180 segundos. Máximo de 24 resultados; filtros y páginas separados. No persistir esta caché en disco ni en el service worker.
- Inicio, catálogo y detalle se refrescan cada 180 segundos en pestañas visibles (`PUBLIC_REFRESH_MS`).
- Las URLs firmadas públicas duran 300 segundos y se renuevan cuando quedan 45 segundos; máximo de 256 rutas. Las firmas del panel y el `cacheControl` de las subidas conservan 60 segundos.
- El detalle y los métodos de validación del carrito no guardan resultados terminados. Conservar la lectura remota de precios y disponibilidad antes de preparar la consulta por WhatsApp.
- `force` evita la caché de resultados para reintentar. `invalidateCatalog()` limpia la caché tras acciones del panel en esta pestaña. Una lectura anterior pendiente no debe repoblarla después de invalidar.
- Las tarjetas consultan solo datos necesarios para precio, disponibilidad y portada. El detalle conserva las especificaciones completas. Mantener paginación y miniaturas; no descargar todas las fotos del catálogo.
- El bucket sigue privado. No debilitar RLS ni convertirlo en público para mejorar la caché.
- `selectPublicProducts()` también es utilizado por `api/sitemap.js`; conservar esa interfaz y sus filtros públicos.
- Evidencia y límites de las mediciones: `RENDIMIENTO_Y_COSTOS.md` y `egress-comparison-20261124.json`. Las cifras son bytes JSON decodificados y no ahorro mensual facturado.
- La optimización anterior de archivos y miniaturas está documentada en `OPTIMIZACION_IMAGENES_GUARDADAS.md`; no repetir backfills ni borrar respaldos automáticamente.

## Verificación y archivos privados

- `npm test`: suite de pruebas del proyecto. Tras los cambios visuales y de caché pasaron 112 pruebas; repetir las verificaciones relevantes cuando cambie el código o se integre otro trabajo.
- `npm run build`: compila y ejecuta `scripts/build-search-pages.mjs` para las páginas SEO. Verificar ambos pasos.
- `node --env-file=.env.local scripts/check-supabase.mjs`: lecturas reales de contrato contra Supabase, sin escrituras. Requiere las variables públicas locales.
- `scripts/measure-catalog.mjs`: medición de respuestas; admite un módulo anterior con `BASELINE_CATALOG_MODULE`. No imprime claves ni URLs firmadas.
- El harness de React limpia la caché entre escenarios para que las pruebas no compartan datos ficticios de negocios distintos.
- El decodificador HEIC genera un aviso de chunk grande; su carga está diferida. No ocultar el aviso ni instalar dependencias para silenciarlo.
- La revisión visual de los últimos efectos quedó sin completar: el navegador integrado no estuvo disponible y Computer Use detuvo Firefox en Windows por falta de soporte para aplicar su política de URLs. Las pruebas automatizadas no sustituyen esa revisión.
- `.env.local`, credenciales, claves, logs, `dist`, dependencias y respaldos locales están excluidos de Git. No agregarlos a commits ni copiar sus valores a documentación.
