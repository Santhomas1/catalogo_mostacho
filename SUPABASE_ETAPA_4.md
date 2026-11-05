# Supabase — resultado de la etapa 4

Fecha: 2026-11-04. Entorno de desarrollo; no se modificó el proyecto Lubricentro.

**Actualización al iniciar etapa 5:** el usuario informó que los accesos están organizados y se verificaron en la base **dos cuentas con los correos autorizados, confirmadas y con membresía administrativa activa**. El pendiente de altas descrito más abajo queda resuelto. No se probó login con sus contraseñas; la interfaz se integrará en las etapas siguientes. Las rutas y permisos de imágenes ahora están en `SUPABASE_ETAPA_5.md`.

## Proyecto creado

- Organización: `santithomas` (`izfbykuccfciwjrfvczg`).
- Nombre: `mostacho-3d-desarrollo`.
- Referencia: `dthsrdgvrkoxxqwotedd`.
- Región: `sa-east-1` (São Paulo).
- Costo de creación cotizado por Supabase y aceptado por el usuario: USD 0 mensuales. No es una garantía sobre consumos o cambios de plan futuros.
- Panel: https://supabase.com/dashboard/project/dthsrdgvrkoxxqwotedd

## Migraciones aplicadas

Archivos locales alineados con las versiones del historial remoto:

1. `supabase/migrations/20261104144431_catalogo_inicial.sql`.
2. `supabase/migrations/20261104144535_datos_desarrollo_y_accesos.sql`.

Se generaron los archivos con el CLI oficial y se aplicaron al proyecto mediante el conector. No volver a aplicar estos archivos a este proyecto: ya figuran en su historial. El proyecto sigue sin conectarse al frontend; eso pertenece a la etapa 6.

## Modelo y acceso

Tablas públicas: `categorias`, `productos`, `imagenes_producto`, `variantes_producto`, `materiales` y `colores`. Tablas privadas: `administradores` y `correos_administradores`. Las ocho tienen RLS habilitado.

Los visitantes y usuarios sin autorización leen categorías, materiales y colores activos; solo productos publicados, que no sean ejemplos y cuya categoría esté activa. La misma visibilidad se aplica a imágenes y variantes. Las variantes públicas deben estar activas y usar materiales y colores activos.

Los administradores autorizados pueden leer borradores y gestionar las seis tablas del catálogo. Ninguna cuenta del navegador puede editar las tablas privadas de autorización. No hay tablas de contraseñas propias, RPC públicos privilegiados ni claves privadas en React. `private.es_administrador()` hace una comprobación del usuario actual contra registros privados y correo confirmado; no acepta roles desde `user_metadata`.

Las fechas son `timestamptz` y `actualizado_en` se mantiene con triggers. Las claves foráneas y sus índices, unicidad de slug/SKU, orden de imágenes y controles de precio, medidas, stock y plazo están implementados.

## Publicación y categorías

- Publicar exige al menos una imagen y una variante activa.
- Una comprobación diferida al final de la transacción impide borrar, mover o desactivar el último recurso requerido de un producto publicado.
- Los cambios de imágenes y variantes escriben y bloquean el padre para serializar cambios competidores. No se ejecutó una prueba de carga concurrente con dos conexiones.
- Para dejar un producto sin recursos, primero debe quedar como borrador en esa misma transacción.
- Desactivar una categoría oculta sus productos y datos relacionados; no borra el contenido ni cambia automáticamente `publicado`. React deberá reflejar esto al consultar Supabase en la etapa 6.
- `es_ejemplo = true` impide la lectura pública, incluso si alguien publica por error un producto ficticio.

## Ejemplo cargado

Maceta geométrica de ejemplo, con una categoría, material PLA, colores blanco y celeste y dos variantes (ARS 5.000 y ARS 8.000). Se conserva **en borrador y marcada como ejemplo**. No tiene imágenes porque su carga está aplazada. No se inventaron URLs ni fotos persistentes. ARS y los precios son datos de prueba, no decisiones comerciales reales.

La galería almacena `url` por ahora, según el diagrama inicial. El bucket, las rutas y la privacidad de los archivos corresponden a la etapa 5. Ocultar filas de imágenes no protege por sí solo un archivo con URL pública: no se afirma que Storage esté configurado.

## Dos administradores: autorización lista, cuentas pendientes

Se registraron en la tabla privada los correos entregados por el usuario. No se incluyen en este documento público de referencia; se encuentran en la migración local de accesos y en la lista privada de Supabase.

**Todavía hay cero cuentas reales en Supabase Auth.** El conector permite SQL, migraciones y revisión de permisos, pero no ofrece crear usuarios, enviar invitaciones ni configurar Auth. No se crearon cuentas reales mediante INSERT directo en `auth.users`, no se inventaron contraseñas ni se enviaron correos.

Para finalizar este punto, el propietario debe abrir [Authentication → Users](https://supabase.com/dashboard/project/dthsrdgvrkoxxqwotedd/auth/users) y crear o invitar las dos cuentas mediante el flujo oficial de Supabase. Cada persona debe configurar su contraseña y confirmar su correo mediante ese flujo. Si se usa invitación, revisar previamente las URLs de redirección para desarrollo; las definitivas se configuran en la etapa 9. No compartir contraseñas ni tokens en el chat.

Cuando una cuenta con un correo autorizado y confirmado se crea o actualiza en Auth, el trigger registra su autorización automáticamente. No basta con registrar un correo sin verificarlo. Después, comprobar la creación de ambos registros y realizar una prueba real de autenticación cuando exista la integración correspondiente.

Para revocar acceso, un operador privilegiado puede desactivar el registro de `private.administradores` o el correo autorizado. La función consulta ese estado en cada operación: no espera a renovar un claim de rol del JWT. El borrado de una cuenta no garantiza revocar un JWT existente en otros servicios; este catálogo comprueba también que el usuario siga existiendo.

## Evidencia de verificación

`supabase/tests/permisos_y_reglas.sql` se ejecutó contra la base nueva. Crea datos y actores de prueba dentro de una transacción y termina en `ROLLBACK`; no deja cuentas, fotos ni productos temporales.

El resultado fue OK para:

- Lectura pública de productos visibles y ocultamiento de borradores, categorías inactivas, variantes inactivas y ejemplos.
- Ocultamiento de imágenes y variantes de productos no visibles.
- Rechazo de escritura anónima y de escritura/autoconcesión de rol por usuarios autenticados sin autorización, incluso con metadata falsa de administrador.
- Lectura de borradores y altas, edición y eliminación por un administrador simulado.
- Rechazo de publicación incompleta, eliminación o traslado de la última foto y desactivación o eliminación de la última variante activa.
- Rechazo de precios negativos, stock cero con `en_stock`, producción sin plazo y eliminación de categorías referenciadas.
- Revocación de autorización sin renovar JWT.

Las pruebas SQL simulan los roles PostgreSQL y claims de sesión; **no prueban un login real**. Las cuentas de prueba se revirtieron. Verificación posterior: ocho tablas con RLS, dos correos autorizados, un producto de ejemplo en borrador, dos variantes, cero imágenes y cero usuarios Auth.

Además se consultó la API HTTP usando únicamente la clave publicable, sin guardarla en el frontend: las lecturas anónimas de `productos`, `imagenes_producto` y `variantes_producto` devolvieron cero filas, como corresponde al único producto en borrador. La API de configuración de Auth indicó proveedor de correo habilitado, registro permitido y autoconfirmación deshabilitada. No se cambió esa configuración ni se probó acceso autenticado HTTP: faltan las cuentas reales. La lista privada controla quién puede administrar aunque otro correo se registre sin rol.

El asesor de seguridad de Supabase terminó **sin hallazgos**. El asesor de rendimiento dejó dos avisos informativos de índices aún sin uso en las claves foráneas de material y color. Se conservan para las relaciones y consultas futuras: [explicación del aviso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

La etapa no se declara cerrada hasta finalizar el punto de cuentas/configuración de Auth y revisar el acceso real. Los demás puntos se registran con su evidencia en `TAREAS_DEL_PROYECTO.md`.

## Referencias

- [RLS y permisos de acceso](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Usuarios gestionados por Supabase Auth](https://supabase.com/docs/guides/auth/managing-user-data).
- [Triggers de PostgreSQL](https://supabase.com/docs/guides/database/postgres/triggers).
