# Conexión React ↔ Supabase — etapa 6

Fecha local: 2026-11-04. Proyecto de desarrollo: `dthsrdgvrkoxxqwotedd`.

## Implementación

- Cliente oficial `@supabase/supabase-js` **2.119.0**, fijado sin rango en `package.json` y con `package-lock.json` actualizado.
- Única instancia en `src/lib/supabase.js`, con límite de espera de 15 segundos por solicitud. Los servicios públicos usan esa instancia; las sesiones administrativas se implementarán en la etapa 7.
- `.env.local` contiene la URL del proyecto y su clave **publicable**, y está excluido de Git. `.env.example` solo contiene ejemplos. No se guardaron claves secretas ni `service_role`; todas las variables `VITE_` son públicas por diseño.
- `src/services/catalog-service.js` contiene las consultas y la adaptación del esquema SQL al modelo de la interfaz. `src/services/catalog.js` reutiliza el cliente compartido.
- Inicio, catálogo, detalle y carrito ya no importan los datos locales. Los archivos anteriores en `src/data/` quedan sin uso en la aplicación. No hay un modo de demostración ni fallback silencioso a datos ficticios ante errores.

## Consultas del catálogo

Se filtran explícitamente productos publicados y no marcados como ejemplo, categorías activas y variantes/materiales/colores activos. Esto se suma a las políticas RLS y conserva el comportamiento público incluso si en el futuro se inicia una sesión administrativa en el mismo navegador.

La búsqueda por nombre usa `ilike` y escapa los comodines de la entrada. Los filtros y la página están en la URL; la categoría usa su slug. Se solicitan **12 productos por página**, con conteo exacto y orden estable por fecha e ID. El inicio solicita hasta seis destacados. La lista de categorías pide solamente categorías activas con productos públicos y como máximo un ID de producto por categoría.

Se manejan estados de carga, vacío, error y reintento. Una respuesta antigua de búsqueda no reemplaza a la actual. Si la API informa una página fuera de rango, se muestra la primera y se avisa al usuario. La búsqueda usa la comparación de mayúsculas de PostgreSQL; no se promete equivalencia automática entre palabras con y sin acentos.

El detalle consulta por slug. Un borrador, ejemplo, producto oculto por categoría o slug inexistente se resuelve como no disponible. Las variantes inexistentes o inactivas no se ofrecen; las no disponibles se deshabilitan.

## Imágenes privadas

Las rutas de `imagenes_producto` se firman en lotes por 60 segundos. El resultado se adapta a URLs para los componentes, sin guardarlas como referencias permanentes. Las páginas vuelven a consultar cada 45 segundos cuando están visibles y al recuperar el foco. Un fallo de firma muestra el respaldo y un aviso con reintento; al llegar una URL nueva se restablece el intento de cargar la imagen.

No hay fotos reales cargadas; la emisión positiva de URLs para archivos reales y su visualización quedan para la carga de contenido. Se probó el contrato del SDK para firma y errores con transporte simulado. No se publicaron productos ni archivos para esta etapa.

## Carrito y actualización antes de WhatsApp

`CartProvider` conserva IDs de variantes y cantidades en `localStorage`, sin precios persistidos. Al recuperar, modificar la selección o volver al sitio, consulta las variantes y sus productos reales en lotes de hasta 50 IDs. No descarga todo el catálogo para validar un carrito.

- Mantiene cantidades aunque el servidor falle o retire una opción.
- Conserva nombres vistos durante la visita para facilitar la revisión; esos datos recordados no habilitan una cotización.
- Informa cambios de precio, modalidad, plazo o disponibilidad comparando la información anterior con la actual.
- Marca variantes ocultas, eliminadas, inactivas o no disponibles para que se quiten o ajusten.
- No controla stock. Las opciones con precio a acordar se incluyen en el mensaje sin transformarse en cero ni sumarse al subtotal conocido.
- Si falla la actualización, bloquea la preparación con datos no validados y ofrece reintentar.

El botón **«Actualizar y preparar consulta»** realiza otra consulta remota antes de generar el mensaje. El enlace de WhatsApp y la copia se habilitan únicamente con un resumen válido de esa consulta. Cambiar cantidades, actualizar nuevamente el carrito o pasar 30 segundos invalida el resumen preparado. Las respuestas de solicitudes anteriores no reemplazan una selección más reciente. Abrir WhatsApp conserva el carrito y no envía el mensaje automáticamente.

No se puede garantizar que un precio no cambie en el servidor un instante después de la consulta: el mensaje sigue siendo una cotización estimada a confirmar con el vendedor, no un pedido ni una reserva.

## Verificación y límites

- `node --env-file=.env.local scripts/check-supabase.mjs`: consultas **reales de solo lectura** correctas, incluyendo filtro/paginación, página fuera de rango, slug inexistente, borrador de ejemplo oculto y variante inexistente del carrito.
- Estado público real comprobado: **cero productos y cero categorías con productos visibles**. La maceta de prueba permanece excluida; por eso el catálogo aparece vacío hasta cargar/publicar contenido real.
- Pruebas de servicios con el SDK real y transporte simulado: filtros enviados al servidor, rangos, conteos, mapeo de tipos, firma, respaldo, lotes de variantes, actualización de precios, opciones retiradas y fallos.
- Pruebas de React: recuperación del carrito, consulta previa a WhatsApp, cambio de importes sin perder cantidades, invalidación al editar, fallos y reintentos. Se probaron los componentes con un renderer de pruebas, no un navegador real. El renderer usado emite un aviso de deprecación; es dependencia exclusiva de desarrollo.
- Se mantienen las pruebas de precios, cantidades y servicios de imágenes de las etapas anteriores.
- `npm run build`: compila; React y Supabase se separan en archivos para reducir el paquete inicial único.
- No se ejecutó revisión visual móvil ni de teclado en navegador porque el control de Firefox había sido bloqueado por el entorno. No se probó el flujo con una fotografía real ni con una cuenta administrativa iniciada desde esta web, funciones correspondientes al contenido y al panel.

No se cambió el esquema remoto ni se enviaron mensajes durante esta etapa.

## Referencias

- [Consultas JavaScript y selección de relaciones](https://supabase.com/docs/reference/javascript/select).
- [Rangos de paginación](https://supabase.com/docs/reference/javascript/range).
- [URLs firmadas en lote](https://supabase.com/docs/reference/javascript/storage-from-createsignedurls).
