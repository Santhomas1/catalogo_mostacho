# Imágenes — etapa 5

Fecha local: 2026-11-04. Proyecto: `dthsrdgvrkoxxqwotedd`, desarrollo de Mostacho 3D.

## Accesos verificados

Se comprobaron dos cuentas con los correos autorizados, confirmadas y con autorización administrativa activa. Esto resuelve el pendiente de altas de la etapa 4. No se accedió a contraseñas ni tokens de sus sesiones; el login real de la aplicación se implementará con el panel.

## Configuración aplicada

- Bucket `productos`, **privado**.
- Máximo por archivo: **5 MiB (5.242.880 bytes)**.
- MIME permitidos: JPEG, PNG y WebP. No se aceptan SVG de productos; el favicon y los recursos de marca locales siguen aparte.
- Solo administradores pueden subir archivos, reemplazar archivos sin referencia y eliminar archivos que no se estén utilizando.
- Los visitantes leen archivos asociados a fichas visibles, según las políticas del catálogo: producto publicado, categoría activa y sin marca de ejemplo. Los borradores y archivos sin referencia quedan privados.
- Se solicita una URL firmada de **60 segundos** para mostrar una foto. No se guarda esa URL en la base. Un enlace ya emitido puede seguir funcionando hasta su vencimiento, aunque se oculte el producto; los bytes ya descargados tampoco se pueden revocar. Antes de publicarlo, la integración debe renovar los enlaces cuando venzan y no cachearlos como permanentes.

Migraciones locales y remotas alineadas:

- `20261105004853_imagenes_privadas_storage.sql`.
- `20261105005104_proteger_reemplazo_imagenes.sql`.

Las versiones usan UTC; la sesión ocurrió el 4 de noviembre en Argentina.

## Referencias de imágenes

`imagenes_producto.url` se reemplazó por `storage_path`, y se agregó `bucket_id` con valor `productos`. No había imágenes cargadas al migrar.

Formato: `products/<uuid-producto>/<uuid-imagen>.webp`. También se admiten `.jpg` y `.png` en el bucket para archivos preparados por otros medios. La ruta debe pertenecer al producto de la fila, ser única y existir en Storage antes de guardar la referencia. `texto_alternativo` es obligatorio.

El trigger de referencia bloquea el registro del objeto para evitar que su borrado concurrente deje una referencia inválida. No se ejecutaron pruebas concurrentes con dos conexiones reales.

## Servicios preparados

`src/services/images.js` recibe un cliente Supabase autenticado; no crea una conexión, ni guarda claves, ni integra todavía la interfaz de administración.

- `optimizeImage`: decodifica JPEG/PNG/WebP, limita el lado mayor a 1600 píxeles sin ampliar y exporta WebP con calidad 0,82. La imagen original admite hasta 50 MiB (ampliado el 2026-11-05); el resultado debe quedar dentro de los 5 MiB del bucket.
- `uploadProductImage`: exige texto alternativo y orden válido, genera un UUID nuevo, sube con `upsert: false` y guarda la referencia después. Si falla la referencia, intenta eliminar el archivo por la API. Si falla esa compensación, registra la ruta para limpieza; si tampoco puede registrar, informa la ruta para revisión.
- `signedImageUrl`: obtiene un enlace temporal sujeto a los permisos del usuario actual.
- `deleteProductImage`: elimina la referencia; el trigger encola la ruta. Sigue vigente la prohibición de quitar la última foto de una ficha publicada.
- `cleanImageQueue`: procesa lotes de hasta 100 rutas, vuelve a verificar referencias y elimina por la API de Storage. Solo retira el pendiente cuando Storage confirma la operación. Si una ruta está referenciada, la omite.

Para reemplazar una foto, subir una nueva con orden libre, verificar que su referencia se haya guardado y luego quitar la anterior y ajustar el orden. No sobrescribir ni mover un objeto referenciado. Así se conserva la publicación válida durante el reemplazo y se evitan cachés de una foto anterior.

La cola `archivos_pendientes_limpieza` tiene RLS administrativo. El trigger captura también cambios de ruta y eliminaciones de productos con sus imágenes. No admite volver a vincular una ruta pendiente de limpieza; se debe generar una nueva. La limpieza está preparada como servicio, **no programada como cron ni conectada a una pantalla**. En la etapa de administración deberá ejecutarse tras las operaciones de imágenes y ofrecer reintento. No elimina archivos ajenos ni hace borrados masivos automáticos.

No ejecutar DELETE directo sobre `storage.objects`: eso manipularía metadatos y no eliminaría el archivo físico. La configuración de bucket se declaró en la migración; los archivos se gestionarán exclusivamente por la API.

## Respaldo y fotos pendientes

Se agregó `public/images/producto-sin-imagen.svg`, usado por las tarjetas y el detalle cuando falta o falla una foto. Es un recurso de respaldo, no una fotografía ficticia de producto.

Las fotos siguen aplazadas. No hay archivos de producto ni referencias persistentes cargados. Falta verificar la conversión real con Canvas y la visualización de un archivo real desde una sesión administrativa. Los servicios se integrarán en las etapas 6 y 7; la ficha continúa usando los datos locales de prueba.

## Evidencia de verificación

- `supabase/tests/permisos_y_reglas.sql`: regresión del catálogo adaptada a las rutas nuevas; pasó.
- `supabase/tests/storage_permisos.sql`: pasó para lectura pública restringida, acceso del administrador a borradores, carga y reemplazo anónimo denegados, reemplazo de objetos referenciados bloqueado, referencias a objetos inexistentes rechazadas y encolado de limpieza. El predicado de eliminación también se evaluó con rol visitante y resultó falso.
- Estas pruebas SQL usan metadatos sintéticos y cuentas de prueba dentro de una transacción que termina en `ROLLBACK`. No cargan ni eliminan archivos físicos; no prueban transportes de subida autenticados ni rendimiento concurrente.
- Prueba HTTP con clave publicable, sin sesión: la API rechazó una carga por RLS (HTTP 400 con `statusCode: 403`, `AccessDenied`). No se creó el archivo.
- `node --test tests/cart.test.js tests/images.test.js tests/ui-render.test.js`: **17 pruebas correctas**. Las pruebas de servicio usan un cliente simulado; no sustituyen la prueba real de optimización, portapapeles o navegador.
- `npm run build`: correcto.

El asesor de seguridad no señaló problemas de RLS o Storage. Sí detectó que la protección de Auth contra contraseñas filtradas está desactivada: [revisión y configuración](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se modificó esa configuración ajena a Storage desde este conector. El asesor de rendimiento conserva avisos informativos de índices de material/color aún sin uso: [explicación](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Referencias oficiales

- [Buckets privados y públicos](https://supabase.com/docs/guides/storage/buckets/fundamentals).
- [Permisos de Storage](https://supabase.com/docs/guides/storage/security/access-control).
- [Esquema de Storage y operaciones por API](https://supabase.com/docs/guides/storage/schema/design).
