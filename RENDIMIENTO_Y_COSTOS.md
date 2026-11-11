# Rendimiento y costos de Mostacho 3D

Revisión: 11 de noviembre de 2026. Implementación local; sin despliegues, cambios de planes, migraciones remotas ni eliminación de archivos del proyecto alojado. Se conservaron los cambios anteriores de variantes y WhatsApp.

## Resultado y prioridades

1. **Imágenes:** el listado firmaba todas las fotos de cada producto aunque mostraba solo una. Ahora solicita y firma únicamente la portada. Administración firma su galería en una sola petición por lote. Las miniaturas WebP de 640 px están implementadas y protegidas por una migración aditiva, pero requieren activación posterior a pruebas en staging.
2. **Consultas repetidas y respuestas grandes:** se retiraron descripciones y cuidados del listado, fotos del carrito y conteos exactos de detalle, carrito, destacados y cola de limpieza. Se mantienen conteos donde sostienen el total y la paginación. Las lecturas públicas simultáneas idénticas comparten la petición en curso; escribir una búsqueda espera 250 ms.
3. **Caché:** los JS/CSS/WASM con hash reciben un año de caché del navegador. Las URLs firmadas se reutilizan brevemente en un cliente exclusivamente anónimo; no se almacenan respuestas de administración ni precios. No se agregan funciones de servidor.

## Arquitectura y observaciones comprobadas

Versiones instaladas según lockfile: React 19.3.1, React Router 7.18.5, Vite 6.4.5 y supabase-js 2.119.0. Es una SPA compilada a `dist`; Vercel reescribe las rutas a `index.html`. Las consultas salen del navegador hacia PostgREST y Storage. No hay SSR, middleware, API propia, Realtime, cron, conexiones directas a Postgres ni visor/modelos 3D en el código inspeccionado. No hace falta agregar pooling ni migrar de framework.

El CI ejecuta pruebas y compila con variables ficticias; no consulta Supabase durante la compilación. HEIC y el codificador WebP se cargan dinámicamente al procesar imágenes. El aviso de bundle grande corresponde principalmente al decodificador HEIC, ya diferido; no se instalaron dependencias nuevas en la aplicación.

Proyecto Supabase comprobado: `mostacho-3d-desarrollo`, el mismo que configura `.env.local`. Tiene 70 productos públicos y 10 categorías visibles. Las estadísticas de tablas indican 71 productos y 162 referencias de imágenes. Storage contiene **162 WebP, 28.366.180 bytes**, promedio 175.100 y máximo 668.096 bytes. El tamaño informado por PostgreSQL es 13.006.515 bytes; no equivale necesariamente a todo el disco facturable del proveedor.

La ventana de logs de 24 horas consultada registró 357 llamadas a productos, 230 a categorías y 92 firmas por lote, además de numerosas firmas individuales de fotos. Hubo 312 verificaciones de autorización administrativa y 310 consultas de usuario. Son conteos de eventos de esa ventana, no usuarios únicos ni consumo mensual. Se mantienen las comprobaciones de identidad y autorización: reducirlas por una cifra de logs no justificaría debilitar el acceso.

Los advisors remotos no reportaron problemas de salud. Performance informó dos índices sin uso sobre material/color; no se eliminaron porque sostienen relaciones y el historial es corto. Seguridad informó protección contra contraseñas filtradas desactivada; su [configuración requiere Pro o superior](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se modificó Auth.

La búsqueda parcial sobre 71 productos y su categoría, con filtros y orden del catálogo, tardó 1,205 ms en una ejecución SQL de diagnóstico; leyó bloques ya disponibles en memoria. Se ejecutó con el rol del diagnóstico, no representa el plan completo de PostgREST con RLS anónimo. No justifica sumar GIN/trigramas todavía. Ya existen índices de slug, categoría, publicación, relaciones y orden de imágenes. Revisar nuevamente con volumen y consultas lentas reales antes de agregar índices.

## Medición antes y después

Se ejecutó el mismo recorrido contra el Supabase real con cliente anónimo: primera página, detalle del primer producto y destacados. Las lecturas no modifican datos. El estado previo se guardó antes de implementar; los registros reproducibles están en `performance-comparison.json`.

| Medida del recorrido | Antes | Después |
| --- | ---: | ---: |
| Peticiones HTTP de datos y firmas | 6 | 6 |
| Bytes de respuestas JSON decodificadas | 37.803 | 23.425 |
| Rutas enviadas a firmar | 31 | 15 |
| Consultas con conteo exacto | 3 | 1 |
| Tiempo sumado de esas peticiones | 1.537 ms | 907 ms |

La reducción medida del payload es **38,0%** y la de rutas firmadas, **51,6%**. Los bytes son del cuerpo decodificado por `fetch`, no bytes de red comprimidos ni egress facturado. No se descargaron los binarios de todas las fotos durante el benchmark. La muestra de tiempo tiene cachés calientes y orden antes/después: **no demuestra una mejora estable del 41% en latencia**. Repetir con muestras alternadas para estimar tiempos representativos.

Una galería administrativa de N fotos ahora hace una llamada de firma, frente a N antes. Está verificado con pruebas de contrato; no se simuló una sesión administrativa real para presentar un ahorro mensual inventado.

Las miniaturas aún no existen en Storage: no se atribuye a ellas ningún ahorro de bytes de esta medición. Generarlas al subir evita pagar transformaciones por visita; añade un archivo pequeño por foto y trabajo de codificación solo durante la carga. Mantiene el original optimizado de hasta 1600 px para el detalle. Las fotos antiguas conservan su archivo actual hasta que se reemplacen explícitamente.

## Estrategia de caché y actualización

| Contenido | Dónde y cuánto | Invalidación |
| --- | --- | --- |
| JS/CSS/WASM con hash en `/assets/` | Navegador: un año, `immutable`; CDN estática de Vercel | Un build cambia el hash y la URL |
| HTML público de la SPA | Distribución estática de Vercel; navegador revalida | Nuevo despliegue; los productos no están incrustados en HTML |
| `/admin` y `/carrito` | `private, no-store` explícito | Carga de red; sin caché pública de sesión |
| Datos públicos | Solo promesas simultáneas mientras la lectura está en curso; sin caché de resultados | La siguiente lectura consulta nuevamente Supabase |
| URLs de imágenes públicas | Memoria del navegador, hasta 15 s de reutilización; máximo 256 rutas | Se renuevan cuando quedan 45 s o menos de los 60 s de vigencia |
| Fotos ya cargadas en una pantalla | Estado del componente y bytes ya cargados; no se cambia `src` solo por renovar la firma | Desmontaje o cambio de ruta de archivo; el respaldo temporal no queda fijado |
| Archivos de Storage | `cacheControl: 60`, rutas UUID nuevas y sin sobrescritura | Cambiar la referencia usa una URL distinta |
| Service worker | Solo pantalla genérica sin conexión | Versión del worker; no guarda catálogo, API ni sesión |

El cliente público no persiste sesión, no acepta callbacks de Auth y usa una clave de almacenamiento distinta a administración. Esto evita que una firma privilegiada de un borrador entre en la reutilización del catálogo. No se amplió el vencimiento de 60 s ni se convirtió el bucket privado en público.

Una edición se ve en la próxima lectura: inmediatamente al volver a cargar/navegar, o en el siguiente refresco visible de 45 s, más la duración de la consulta. No hay actualización de fondo en pestañas ocultas; al recuperar foco se consulta si la información tiene al menos 45 s. El carrito mantiene su validación remota antes de preparar WhatsApp. Para las imágenes, expiración de la firma y duración de caché son conceptos distintos; no se promete revocación instantánea de bytes que alguien ya descargó. Véase [Storage y URLs firmadas](https://supabase.com/docs/guides/storage/cdn/smart-cdn).

Se conservan los reintentos acotados del SDK para fallos transitorios y los botones de reintento. No se añadieron reintentos infinitos, escrituras por visita, keep-alives para impedir pausas ni tareas programadas. Los timers y listeners se retiran al desmontar.

Comprobación del despliegue existente: `/` y `/catalogo` respondieron 200 y `x-vercel-cache: HIT`; el JS con hash también fue HIT, pero tenía `public, max-age=0, must-revalidate`. Por eso se añadió caché larga del navegador. `/admin` devolvía el HTML estático genérico y `noindex`, sin `private, no-store`; eso también quedó explícito en la configuración local. La nueva configuración **todavía no está desplegada**. La caché CDN observada no depende de memoria de una función; no existe una función de servidor en este flujo.

## Archivos principales

- `src/services/catalog-service.js`, `src/services/catalog.js`, `src/lib/supabase.js`: proyecciones, portadas, conteos, deduplicación, firmas y cliente anónimo.
- `src/hooks/useRemote.js`, `src/pages/Catalog.jsx`, `src/components/HomeCatalog.jsx`: búsqueda y refrescos.
- `src/services/images.js`, `src/admin/ImagesPanel.jsx`, `src/admin/ProductWorkspace.jsx`, `src/admin/AdminPanel.jsx`: firmas por lote, miniaturas, compensación de cargas y referencias durante limpieza.
- `src/pages/Product.jsx`: miniaturas de galería; conserva los cambios anteriores de elección de variante.
- `src/lib/image-settings.js`, `.env.example`: activación compatible con el esquema anterior.
- `vercel.json`: caché de assets y exclusión explícita de rutas privadas.
- `supabase/migrations/20261111135346_miniaturas_privadas_productos.sql`: columna opcional, validación de ambos archivos, permisos de lectura bajo RLS, protección contra sobrescritura/borrado y cola de limpieza de ambas rutas.
- Pruebas y scripts en `tests/`, `scripts/measure-catalog.mjs`, `scripts/verify-thumbnail-migration.mjs`.

## Evidencia de verificación

La línea de base pasó 90 pruebas. Las pruebas nuevas detectaron antes del cambio el exceso de fotos, conteos y regeneración de firmas. La suite integrada pasa las 101 pruebas y se ejecuta con `npm test`; los resultados finales se guardan en `performance-final-tests.log`. Las compilaciones con miniaturas desactivadas y activadas pasan. El aviso sobre tamaño del chunk HEIC continúa y su carga sigue diferida.

`node --env-file=.env.local scripts/check-supabase.mjs` pasó contra el servicio real: paginación, filtros, productos ocultos/inexistentes y variantes inexistentes. `scripts/measure-catalog.mjs` mide datos públicos sin imprimir claves ni URLs firmadas. Puede compararse con un módulo anterior mediante `BASELINE_CATALOG_MODULE`, una ruta absoluta al archivo anterior del servicio.

`scripts/verify-thumbnail-migration.mjs` ejecutó las nueve migraciones en PostgreSQL embebido PGlite 0.5.16, instalado temporalmente fuera de las dependencias de la aplicación. Pasaron DDL/triggers, escritura administrativa, privacidad de borradores y categorías inactivas, lectura pública de ambas resoluciones, inmutabilidad de referencias, rechazo de miniatura inexistente y encolado de las dos rutas al quitar una imagen. Auth y Storage son fixtures locales: **no sustituye la comprobación HTTP de Supabase en staging**.

Las pruebas de reloj comprueban que el foco reciente no repite consultas, el precio nuevo aparece a los 45 s y desmontar limpia los recursos. Las pruebas de imágenes comprueban resolución 640 sin ampliar fotos pequeñas, carga de ambos archivos antes de guardar, compensación si falla una carga y firma por lotes con errores parciales. No se modificaron las reglas existentes para conceder acceso a usuarios sin autorización.

Veredicto: código y pruebas locales aprobados; verificación de activación de miniaturas y de los nuevos encabezados en un despliegue, pendiente. No se afirma que esos cambios ya estén funcionando en producción.

## Activación manual y reversión

1. Se puede revisar/desplegar el código con `VITE_PRODUCT_THUMBNAILS=false` sin cambiar la base. Confirmar build `npm run build`, salida `dist` y variables públicas; nunca colocar claves secretas en variables `VITE_*`.
2. Probar la migración en una instalación de staging con el mismo historial. Revisar y aplicar luego la migración aditiva mediante el flujo autorizado del proyecto. No se aplicó automáticamente. Conservar el bucket privado y sus políticas.
3. Activar `VITE_PRODUCT_THUMBNAILS=true` en ese entorno y recompilar. Cargar una imagen de prueba por la interfaz administrativa: debe crear dos WebP, una referencia y las URLs correctas. Verificar portada de 640 px, detalle de hasta 1600 px, carga diferida y galería.
4. En un navegador sin sesión, comprobar lectura de originales/miniaturas de productos publicados, denegación de firmas nuevas de borradores y categorías inactivas, y ausencia de datos administrativos. Las URLs emitidas anteriormente siguen su vigencia; una prueba de ocultamiento no debe confundir eso con una firma nueva.
5. Editar precio/color/categoría/disponibilidad y comprobar que el catálogo abierto refleja el cambio al siguiente ciclo visible de 45 s. Revisar carrito y WhatsApp. Cambiar portada y confirmar la nueva ruta. Verificar los headers de assets, `/admin`, `/carrito`, `/sw.js` y la segunda carga desde caché en DevTools. Una Preview protegida puede agregar encabezados propios: contrastar con un despliegue representativo autorizado.
6. Reversión inmediata: desactivar la variable y volver a desplegar; conservar columna, miniaturas y políticas. Las imágenes originales siguen funcionando. No hacer un DROP de columna ni borrar miniaturas como rollback: primero inventariar sus referencias y presentar una lista revisable. La base actual no necesita rollback porque no se modificó.

No se hizo backfill ni limpieza masiva de fotos existentes. La limpieza administrativa conserva sus confirmaciones y verificaciones de referencias.

## Planes, límites y condiciones vigentes

El catálogo anuncia productos para vender. **Vercel Hobby no es elegible**, independientemente del tráfico: su [política de uso comercial](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage) requiere Pro o Enterprise. [Pro](https://vercel.com/docs/plans/pro-plan) parte de USD 20/mes, con una plaza incluida, más adicionales/uso aplicable. No se cambió el plan ni se verificó el plan real de la cuenta porque no hay acceso conectado a su facturación.

Como referencia, [Hobby](https://vercel.com/docs/plans/hobby) publica 100 GB de transferencia, 1 millón de peticiones CDN e invocaciones, 4 CPU-h y 360 GB-h de memoria aprovisionada; no son una autorización comercial ni la memoria de una función de esta aplicación. Aquí no se generan invocaciones propias. Los consumos relevantes son entrega de estáticos, peticiones CDN y builds; la memoria de funciones no aplica al flujo estático inspeccionado.

[Supabase Free](https://supabase.com/pricing) incluye 500 MB de base, 1 GB de archivos y 50.000 usuarios activos autenticados mensuales. Los visitantes anónimos del catálogo no son MAU de Auth. Tiene pausa tras una semana de inactividad y hasta dos proyectos activos. La [transferencia](https://supabase.com/docs/guides/platform/manage-your-usage/egress) se divide en cuotas separadas de 5 GB sin caché y 5 GB con caché; no se suman como una única bolsa intercambiable. Free tiene CDN básico; transformaciones de imágenes y Smart CDN requieren un plan superior. Generar miniaturas al subir mantiene compatible el camino gratuito.

Realtime y Edge Functions no se usan en esta arquitectura; sus cupos no justifican cambios aquí. No se confirmó el consumo mensual de la organización ni el de su otro proyecto. Los límites compartidos deben revisarse en el dashboard antes de proyectar capacidad disponible para Mostacho.

## Control del consumo y crecimiento

Revisar semanalmente el Usage de la organización Supabase, filtrando por proyecto y ciclo: egress sin caché/con caché por servicio, archivos, base, errores y tiempos de API. Confirmar el correo de facturación: Supabase envía avisos al exceder cuotas. Free no necesita un servicio de alertas propio; su Spend Cap configurable pertenece a Pro y no ofrece presupuestos personalizados por umbral. Si se pasa a Pro, mantener el [Spend Cap](https://supabase.com/docs/guides/platform/cost-control) mientras se decide qué excedentes aceptar; no cubre todos los conceptos, por ejemplo compute o branching.

En Vercel Pro, usar Settings → Spend Management con un presupuesto acorde al negocio y avisos por email: el sistema notifica al 50%, 75% y 100%. Evaluar explícitamente si aceptar una pausa automática al alcanzar el presupuesto, porque puede dejar el catálogo fuera de servicio. Revisar también CDN requests, transferencia, builds y cualquier aparición inesperada de funciones en Usage. Los [avisos nativos](https://vercel.com/docs/spend-management) evitan agregar cron o polling de métricas a esta aplicación.

Como umbrales operativos, revisar al llegar al 70% de una cuota a mitad de ciclo y proyectar `uso / días transcurridos × días del ciclo`. Son criterios de operación sugeridos, no alertas nativas de Supabase que se hayan configurado.

El primer límite técnico probable es **egress de imágenes**, bajo el supuesto de visitas sin caché: 12 portadas al promedio actual representan aproximadamente 2,10 MB por página; 5 GB equivaldrían a unas 2.380 cargas completas, antes de detalle/API/otras aplicaciones. No son visitantes únicos ni una predicción de facturación: lazy loading, caché y tamaño real de las portadas cambian mucho la cifra. Con miniaturas se debe medir nuevamente su peso real; no se promete una relación fija de compresión.

El almacenamiento actual y la base están bastante por debajo de sus cupos, según las mediciones anteriores. Los escenarios de transferencia son más relevantes que comprar capacidad de base hoy. Vercel requiere un plan comercial por elegibilidad ahora. Supabase Pro, desde USD 25/mes según su precio publicado, tiene sentido si la proyección de transferencia excede el cupo, se necesita evitar pausas por inactividad o se requieren backups y funciones de seguridad superiores. Su facturación puede incluir compute de proyectos adicionales y otros conceptos; revisar la cotización real de la organización antes de cambiar.

No hay garantía de permanecer siempre dentro de Free. La estrategia es conservar esta arquitectura estática, medir transferencia real, generar derivados durante las cargas, mantener RLS y ampliar el plan cuando las necesidades comprobadas lo justifiquen.
