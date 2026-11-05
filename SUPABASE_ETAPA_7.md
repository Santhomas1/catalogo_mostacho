# Panel administrativo — etapa 7

Fecha local: 2026-11-04. Proyecto: `dthsrdgvrkoxxqwotedd`.

## Acceso y recuperación

Abrir `/admin` o `/admin/login` con una de las dos cuentas autorizadas. El panel comprueba el usuario mediante `auth.getUser()` y consulta `public.mi_acceso_admin()`, que llama a la autorización privada. No confía en `user_metadata` ni habilita operaciones solo por tener una sesión.

La autorización se comprueba con cambios de sesión, al recuperar foco y cada minuto si la pestaña está visible. Una sesión vencida vuelve al acceso; un error de comprobación bloquea el panel y ofrece reintentar. RLS sigue verificando cada lectura y escritura aunque se evite la interfaz. Cerrar sesión afecta al navegador actual.

- `/admin/recuperar`: solicita instrucciones por correo sin revelar si existe la cuenta.
- `/admin/actualizar-clave`: permite establecer una contraseña con sesión válida y permiso administrativo, incluida una sesión obtenida por recuperación o invitación. Exige confirmación y al menos 12 caracteres.
- El cliente oficial procesa los enlaces de Auth. La verificación se programa fuera de `onAuthStateChange` para evitar bloqueos del SDK.
- Las contraseñas se envían únicamente a Supabase Auth: no se guardan en tablas propias ni en registros del proyecto.

### Comprobación pendiente de correo y redirecciones

En [Authentication → URL Configuration](https://supabase.com/dashboard/project/dthsrdgvrkoxxqwotedd/auth/url-configuration), comprobar Site URL y permitir la dirección del entorno abierto. Para Vite habitualmente:

- `http://127.0.0.1:5173/admin/actualizar-clave`
- `http://localhost:5173/admin/actualizar-clave`

Si Vite usa otro puerto, registrar la URL exacta. En producción se usarán el dominio y las URLs de la etapa 9. La aplicación envía su propio origen más `/admin/actualizar-clave` como `redirectTo`.

El conector no permite consultar ni configurar esa lista y el control de Firefox estaba bloqueado por el entorno. **No se verificó ni modificó la configuración remota de URLs, no se enviaron correos de ensayo y no se utilizaron contraseñas reales.** En la etapa 8 se debe probar el correo, enlaces vigentes/vencidos y acceso real de ambas personas. No se afirma que el flujo completo de correo ya esté validado.

## Catálogo y formularios

Categorías, materiales y colores tienen listados paginados, búsqueda por nombre, creación, edición y desactivación. Las categorías incluyen slug y orden; el hexadecimal de color es opcional. Las eliminaciones definitivas exigen confirmación y las claves foráneas protegen registros asociados.

Para productos: crear el borrador con nombre, slug, categoría, descripción y cuidados; después completar Variantes e Imágenes. Se permite destacar, publicar u ocultar respetando las restricciones de la base. Antes de eliminar un producto definitivamente, ocultarlo y guardar; luego confirmar su eliminación. El ejemplo permanece fuera del catálogo y no se convierte en contenido comercial desde el formulario.

Las variantes incluyen SKU único, nombre de la combinación/tamaño, material, color, medidas y peso opcionales. Admiten precio fijo con importe y moneda, o «Acordar con el vendedor» con ambos nulos. El plazo puede quedar a coordinar. No se solicita stock: solo producción por pedido o no disponible. La base impide quitar la última variante activa de una ficha publicada.

### Galería y limpieza

Se carga una imagen a la vez con texto alternativo obligatorio, optimización a WebP y carga compensada. Las vistas previas privadas renuevan sus URLs firmadas. Se puede corregir la descripción, mover arriba/abajo o eliminar con confirmación; la primera foto es la portada.

`reordenar_imagenes` bloquea el producto, valida la lista completa y usa posiciones temporales libres antes de asignar 0..N-1. La operación es atómica y no viola el orden único. Solo un administrador autorizado puede ejecutarla.

Al eliminar una foto se intenta limpiar solo su ruta; al eliminar un producto, solo sus rutas (hasta 50 por operación). Los archivos restantes se gestionan explícitamente en Limpieza de archivos. No se borran pendientes ajenos como efecto lateral de quitar una foto.

Limpieza muestra lotes de hasta 50 y solicita confirmación específica. Revisa referencias y usa la API de Storage. Mantiene los errores para reintentar y no informa éxito si no pudo retirar el pendiente por falta de permisos. No se borra `storage.objects` directamente mediante SQL.

## Validación y cambios simultáneos

Los formularios bloquean envíos duplicados. El servicio limita tablas y campos editables: no permite asignar roles, modificar fechas ni manipular `es_ejemplo` desde un formulario.

Actualizar o eliminar exige la fecha `actualizado_en` del registro leído. Si otra persona lo cambió o se perdieron permisos, la operación no se informa como exitosa y se solicita recargar. Guardar una sección vuelve a cargar los datos de la ficha. Guardar antes de cambiar de sección: no hay autoguardado de formularios pendientes.

## Migración y evidencia

Migración local/remota: `supabase/migrations/20261105014136_funciones_panel_admin.sql`. Las funciones públicas son SECURITY INVOKER, con search_path fijo y EXECUTE solo para authenticated; ordenar también comprueba el rol y conserva RLS.

- `npm test`: **44 pruebas correctas** de servicios, acceso, formularios, confirmaciones, catálogo, carrito e imágenes. Auth se prueba con sesiones/transporte simulados; no son logins reales.
- `supabase/tests/panel_admin.sql`: ejecutado contra el proyecto real con fixtures temporales y ROLLBACK. Verificó acceso denegado sin rol, RPC administrativo, orden de galería, rechazo de IDs duplicados, lectura pública del cambio administrativo y regresiones del catálogo. No dejó datos de ensayo.
- `node --env-file=.env.local scripts/check-supabase.mjs`: lectura pública correcta, catálogo vacío y ejemplo oculto.
- `npm run build`: correcto.

El asesor de Supabase no reportó problemas nuevos de funciones o RLS. Persiste el aviso de [protección de contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Las pruebas React usan una herramienta de desarrollo deprecada que emite un aviso; no está en producción. No se ejecutó revisión visual/móvil/teclado ni una carga real con Canvas y Storage. Esas verificaciones, correo y login reales quedan para la etapa 8. No se publicó el sitio ni se cargaron productos reales.
