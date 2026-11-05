# Plan de trabajo — Catálogo de impresiones 3D

## Cómo usar esta lista

Trabajar en orden, completar una etapa y comprobar su resultado antes de avanzar, salvo indicación expresa del usuario. Marcar `[x]` cuando una tarea esté terminada y verificada. El usuario autorizó avanzar a la etapa 2 conservando los pendientes de la etapa 1; Supabase todavía no está configurado.

**Tecnologías acordadas:** JavaScript, React y Supabase. Usaremos Vite para el frontend, PostgreSQL de Supabase para los datos, Supabase Auth para el acceso administrativo y Supabase Storage para las imágenes. Para esta primera versión, React se comunicará con Supabase mediante su cliente de JavaScript; no necesitamos desarrollar una API propia con Express.

**Primera versión:** catálogo público, detalle con variantes, carrito de cotización, envío del carrito completo por WhatsApp y panel administrativo. Los pagos online y la gestión de pedidos y envíos quedan para después.

**Recorrido principal:** elegir producto y variante → agregar cantidad al carrito → seguir eligiendo → revisar el carrito → enviar la consulta completa por WhatsApp. El mensaje se abre preparado para que el visitante lo revise y lo envíe. La cotización final y los plazos se confirman con el negocio.

**Guardado inicial del carrito:** conservar variantes y cantidades en el navegador mediante `localStorage`, sin exigir una cuenta. Esto permite recargar o volver al sitio desde el mismo navegador y dispositivo. No reserva stock ni crea un pedido. Al recuperar el carrito, se deben consultar nuevamente precios y disponibilidad. La sincronización entre dispositivos queda para una versión futura.

Documentos de referencia: [idea general](./IDEA_GENERAL_DEL_PROYECTO.md) y [diagrama de datos](./DIAGRAMA_BASE_DE_DATOS.md).

## Etapa 1 — Definir contenido y alcance

- [ ] 1.1 Confirmar nombre del negocio, logo, colores y estilo visual.
- [ ] 1.2 Definir número de WhatsApp, redes y datos de contacto.
- [ ] 1.3 Elegir las primeras categorías y entre 3 y 5 productos de ejemplo.
- [ ] 1.4 Reunir fotos, descripciones, materiales, colores y tamaños.

**Aplazamiento confirmado:** por ahora no se incorporarán productos iniciales ni imágenes de ejemplo. Continuar con las demás definiciones; 1.3 y 1.4 mantienen sus pendientes de contenido hasta que se retome su carga.

- [ ] 1.5 Definir moneda, precios y plazos de producción. Confirmados trabajo por pedido, sin stock, y modalidades de precio fijo o a acordar; faltan importes y moneda reales.
- [ ] 1.6 Confirmar las páginas: inicio, catálogo, producto, carrito, contacto y administración.
- [ ] 1.7 Actualizar el diagrama para contemplar Supabase Auth y la autorización de administradores, sin crear una tabla propia de contraseñas.
- [ ] 1.8 Definir cómo se tratarán las categorías desactivadas y sus productos publicados.
- [ ] 1.9 Definir si las fotos de borradores deben ser privadas o pueden tener enlaces públicos.

**Resultado:** contenido mínimo preparado y reglas claras para empezar.

## Etapa 2 — Preparar el proyecto React

- [x] 2.1 Verificar Node.js y el gestor de paquetes que se utilizará. Node 22.17.0 y npm 10.9.2.
- [x] 2.2 Crear el proyecto con Vite, React y JavaScript.
- [x] 2.3 Configurar Git y un `.gitignore` que excluya secretos y archivos locales. Repositorio local inicializado, sin commits ni remoto.
- [x] 2.4 Organizar carpetas para componentes, páginas, administración, servicios y estilos.
- [x] 2.5 Instalar y configurar React Router.
- [x] 2.6 Definir estilos generales: colores, tipografía, espaciado y botones. Tailwind CSS y base shadcn/ui en JavaScript, paleta celeste y blanca.
- [x] 2.7 Crear encabezado, navegación, pie de página y estructura adaptable.
- [x] 2.8 Crear las rutas y una página para direcciones inexistentes.
- [x] 2.9 Agregar instrucciones para instalar y ejecutar el proyecto en el README.

**Comprobación:** la aplicación inicia y permite recorrer las páginas desde computadora y celular.

**Verificación actual:** `npm run build` completó correctamente; Vite inició y las ocho direcciones comprobadas devolvieron HTTP 200 con la entrada React. Esta prueba HTTP verifica la entrega de la aplicación, no el renderizado de las rutas. La comprobación visual y de navegación en computadora y celular sigue pendiente: el acceso automatizado al navegador no estaba disponible. Los estados vacíos no contienen productos ficticios; administración y autenticación no están implementadas.

## Etapa 3 — Construir el catálogo con datos de ejemplo

- [ ] 3.1 Preparar datos locales que respeten productos, variantes e imágenes del diagrama.
- [ ] 3.2 Crear la tarjeta de producto con imagen, nombre y precio desde. Componente implementado con producto ficticio autorizado y marcador de imagen; pendiente foto y revisión visual. Demo solo en desarrollo.
- [x] 3.3 Armar el inicio con presentación, categorías y destacados.
- [x] 3.4 Crear la grilla del catálogo.
- [x] 3.5 Agregar búsqueda por nombre y filtro por categoría.
- [ ] 3.6 Crear la página de detalle y su galería de imágenes.
- [x] 3.7 Permitir seleccionar una variante existente por material, color y tamaño.
- [x] 3.8 Actualizar precio, medidas y disponibilidad según la variante seleccionada.
- [x] 3.9 Evitar ofrecer combinaciones inexistentes o variantes inactivas.
- [x] 3.10 Agregar selector de cantidad y botón «Agregar al carrito» en el detalle del producto.
- [x] 3.11 Agregar contacto, estados sin resultados y avisos de producto no disponible.
- [ ] 3.12 Revisar la interfaz en celular y la navegación con teclado.

- [x] 3.13 Crear el estado compartido del carrito en React, identificando cada línea por el ID de la variante.
- [x] 3.14 Sumar cantidades al agregar la misma variante y mantener separadas las variantes distintas del mismo producto.
- [x] 3.15 Crear la página `/carrito` con productos, variantes, cantidades, precios de referencia, subtotales y total estimado en la moneda definida.
- [x] 3.16 Permitir modificar cantidades enteras positivas, quitar productos y vaciar el carrito con confirmación.
- [x] 3.17 Agregar el botón «Seguir eligiendo» para volver al catálogo conservando el carrito.
- [x] 3.18 Agregar acceso al carrito desde el encabezado con la cantidad total de unidades.
- [x] 3.19 Guardar y recuperar el carrito con `localStorage`; manejar datos inválidos o almacenamiento no disponible sin impedir navegar.
- [x] 3.20 Agregar el botón «Enviar carrito por WhatsApp» y deshabilitarlo cuando el carrito esté vacío o tenga selecciones inválidas.
- [x] 3.21 Generar un único mensaje con todos los productos, SKU, materiales, colores, tamaños, cantidades, enlaces, precios de referencia y total estimado; codificar correctamente el texto.
- [x] 3.22 Indicar que el total es estimado y que precio final, disponibilidad y plazos se confirman al cotizar.
- [x] 3.23 Conservar el carrito al abrir WhatsApp: abrir el enlace no confirma que se haya enviado el mensaje.
- [x] 3.24 Preparar una alternativa para copiar el resumen completo si el enlace resulta demasiado largo o no se puede abrir.
- [x] 3.25 Mostrar un estado de carrito vacío con un botón para comenzar a elegir productos.

**Comprobación:** se pueden agregar varios productos, seguir eligiendo, recargar sin perder la selección, editar cantidades y preparar una sola consulta por WhatsApp con todo el carrito.

**Estado de la etapa 3:** catálogo, detalle y carrito local implementados con un único producto ficticio autorizado, fuera de producción. Los precios ARS siguen siendo ejemplos, no una moneda comercial confirmada. Galería preparada para recibir imágenes; fotos y verificación visual/móvil/teclado pendientes (3.1, 3.2, 3.6 y 3.12). Pruebas automatizadas de lógica y renderizado; no sustituyen las pruebas de interacción en navegador. El caso de varios productos distintos queda pendiente de contenido; se verificaron varias variantes y un mensaje con varias líneas. La etapa no está cerrada.

## Etapa 4 — Preparar Supabase y los permisos

- [x] 4.1 Crear o elegir el proyecto de Supabase para desarrollo.
- [x] 4.2 Definir nombres consistentes para tablas y columnas usando el diagrama como referencia.
- [x] 4.3 Preparar migraciones SQL versionadas para categorías, productos, imágenes, variantes, materiales y colores.
- [x] 4.4 Crear claves foráneas, índices y restricciones de precios, medidas y disponibilidad por pedido; validar precio fijo o a acordar, sin controles de stock.
- [x] 4.5 Configurar fechas de creación y actualización.
- [x] 4.6 Configurar Supabase Auth para administradores y definir cómo se crean sus cuentas. Al iniciar etapa 5 se verificaron ambas cuentas confirmadas y sus membresías activas. El login desde la web se integra con la administración.
- [x] 4.7 Definir un rol de administrador que el usuario no pueda asignarse ni modificar por su cuenta.
- [x] 4.8 Activar Row Level Security (RLS) en todas las tablas expuestas y revisar los permisos de acceso de la API.
- [x] 4.9 Permitir al público leer únicamente los datos necesarios del catálogo publicado.
- [x] 4.10 Aplicar la visibilidad del producto también a sus variantes e imágenes para impedir consultar datos de borradores directamente.
- [x] 4.11 Restringir las altas, modificaciones y eliminaciones a administradores autorizados; iniciar sesión no alcanza para ser administrador.
- [x] 4.12 Hacer cumplir en la base de datos las reglas de publicación: al menos una imagen y una variante activa, incluyendo cambios posteriores sobre esos registros.
- [x] 4.13 Cargar los productos de ejemplo y verificar las relaciones.
- [x] 4.14 Probar permisos como visitante, usuario autenticado sin rol y administrador antes de conectar la aplicación.

**Comprobación:** pruebas SQL con transacción revertida verificaron lectura pública, denegación al usuario sin rol y CRUD administrativo; también restricciones de publicación y revocación. Asesor de seguridad sin hallazgos. Proyecto `dthsrdgvrkoxxqwotedd`, dos migraciones aplicadas y ejemplo en borrador. Auth habilita correo y exige confirmación; falta el alta de las dos cuentas reales (4.6), por lo que la etapa no se declara cerrada. Evidencia y límites en `SUPABASE_ETAPA_4.md`.

## Etapa 5 — Configurar las imágenes

- [x] 5.1 Crear el bucket de Supabase Storage y decidir su acceso según la privacidad acordada para los borradores.
- [x] 5.2 Definir permisos de lectura y permitir cargas, reemplazos y eliminaciones solamente al administrador.
- [x] 5.3 Limitar tamaño y tipos de archivo admitidos.
- [x] 5.4 Definir rutas de archivos únicas y guardar su referencia en la tabla de imágenes.
- [x] 5.5 Actualizar el diagrama si se guardan rutas de Storage en lugar de URLs permanentes.
- [ ] 5.6 Preparar imágenes optimizadas, textos alternativos y una imagen de respaldo. Servicio de conversión a WebP y respaldo SVG preparados; falta incorporar fotos reales y comprobar optimización/visualización en navegador.
- [x] 5.7 Definir cómo limpiar archivos sin referencia cuando falle una carga o se quite una imagen.
- [x] 5.8 Comprobar que un visitante no pueda subir, reemplazar ni borrar archivos.

**Estado etapa 5:** bucket privado `productos`, límite 5 MiB y JPEG/PNG/WebP; rutas únicas, RLS, protección de archivos referenciados y cola de limpieza implementados. Pruebas SQL, carga anónima HTTP rechazada, 17 pruebas de aplicación y build correctos. Falta una carga real desde una sesión administrativa y la comprobación visual; no hay fotos cargadas ni servicios conectados a una pantalla todavía. Ver `SUPABASE_ETAPA_5.md`.

## Etapa 6 — Conectar React con Supabase

- [x] 6.1 Instalar el cliente de Supabase para JavaScript, fijar su versión y guardar el archivo de bloqueo de dependencias.
- [x] 6.2 Crear un único cliente compartido por los servicios de la aplicación.
- [x] 6.3 Configurar la URL del proyecto y la clave publicable en las variables de entorno del frontend.
- [x] 6.4 Agregar un `.env.example` con valores de ejemplo. No incluir claves secretas ni `service_role` en React: las variables `VITE_` son visibles en el navegador.
- [x] 6.5 Crear servicios de consulta para categorías, productos, variantes e imágenes.
- [x] 6.6 Reemplazar los datos locales por consultas reales.
- [x] 6.7 Resolver búsqueda, filtros y paginación desde las consultas para no descargar todo el catálogo.
- [x] 6.8 Incorporar estados de carga, errores, reintentos y resultados vacíos.
- [x] 6.9 Comprobar enlaces directos a productos y manejo de productos ocultos o inexistentes.
- [x] 6.10 Verificar que los precios mostrados correspondan a variantes activas y a la moneda definida.
- [x] 6.11 Consultar nuevamente precios y disponibilidad del carrito al recuperarlo y antes de preparar el mensaje de WhatsApp; informar cambios sin perder las cantidades elegidas.
- [x] 6.12 Marcar productos ocultos y variantes eliminadas, inactivas o no disponibles. No limitar cantidades por stock; mostrar plazo de producción o «A coordinar». Permitir consultar opciones con precio a acordar, sin sumarlas al subtotal conocido.
- [x] 6.13 Si falla la actualización del carrito, conservarlo y ofrecer reintentar antes de generar la cotización.

**Comprobación:** servicios reales verificados por HTTP con clave publicable; catálogo vacío correcto y ejemplo oculto. Tests de contratos del SDK y componentes React verifican filtros/rangos, precios, carrito, actualización antes de WhatsApp, errores y reintentos. Build correcto. Revisión visual/móvil, fotos reales y acceso administrativo desde la web siguen pendientes de sus etapas correspondientes. Evidencia en `SUPABASE_ETAPA_6.md`.

## Etapa 7 — Construir el panel administrativo

- [x] 7.1 Crear inicio y cierre de sesión con Supabase Auth.
- [x] 7.2 Manejar sesión vencida, credenciales incorrectas y recuperación de contraseña.
- [x] 7.3 Restringir las pantallas administrativas y comprobar el rol autorizado.
- [x] 7.4 Crear listado y formularios de categorías, materiales y colores.
- [x] 7.5 Crear listado, alta y edición de productos.
- [x] 7.6 Agregar carga, orden y eliminación de imágenes.
- [x] 7.7 Agregar alta y edición de variantes con SKU único.
- [x] 7.8 Permitir elegir precio fijo (importe y moneda) o «Acordar con el vendedor», y actualizar el plazo opcional de producción. No solicitar stock.
- [x] 7.9 Permitir publicar, ocultar y destacar productos.
- [x] 7.10 Mostrar errores de validación y confirmación de guardado; evitar envíos duplicados.
- [x] 7.11 Priorizar desactivación y ocultamiento; pedir confirmación ante eliminaciones definitivas.
- [x] 7.12 Comprobar que los cambios se reflejen en el catálogo público.

**Implementación etapa 7:** panel en `/admin` con Auth, control de rol, recuperación, formularios del catálogo, galería y limpieza. 44 pruebas automatizadas, pruebas SQL con ROLLBACK y lectura pública verificadas; build correcto. **Pendiente de ensayo real en etapa 8:** login de ambas personas, correo/redirecciones de recuperación, carga real de fotos y revisión visual/móvil/teclado. La configuración de URLs remota no fue comprobada desde el conector. Evidencia y pasos en `SUPABASE_ETAPA_7.md`.

## Etapa 8 — Verificar la primera versión

- [ ] 8.1 Probar el recorrido completo: catálogo → producto → variante y cantidad → carrito → seguir eligiendo → agregar otro producto → enviar todo por WhatsApp.
- [x] 8.2 Probar productos sin fotos, sin variantes activas, no disponibles, por pedido, con precio fijo y con precio a acordar.
- [x] 8.3 Verificar que borradores y variantes inactivas no se filtren mediante consultas directas.
- [x] 8.4 Verificar que visitantes y usuarios sin rol no puedan modificar datos ni archivos.
- [ ] 8.5 Probar acceso administrativo, cierre de sesión y recuperación de contraseña.
- [ ] 8.6 Revisar celular, tablet, computadora, teclado, contraste y etiquetas de formularios.
- [ ] 8.7 Revisar imágenes, tiempos de carga y paginación con un catálogo más grande.
- [ ] 8.8 Configurar títulos, descripciones e imagen para compartir; decidir si hace falta prerenderizado para productos.
- [x] 8.9 Ejecutar la compilación de producción y las verificaciones de código configuradas.
- [ ] 8.10 Registrar y corregir los problemas que impidan publicar.
- [x] 8.11 Probar variantes repetidas, cantidades inválidas, eliminación de líneas y carrito vacío.
- [ ] 8.12 Verificar persistencia al recargar y volver al sitio desde el mismo navegador, incluyendo almacenamiento inválido o no disponible.
- [x] 8.13 Probar cambios de precio o modalidad de cotización y productos retirados mientras estaban guardados en el carrito; comprobar subtotales mixtos sin convertir precios desconocidos a cero.
- [x] 8.14 Verificar el mensaje completo con varios productos, acentos y caracteres especiales; comprobar cantidades, subtotales y total estimado.
- [ ] 8.15 Probar carritos largos y la alternativa de copiar el resumen; comprobar que abrir WhatsApp no borre el carrito.

**Comprobación:** los recorridos principales y los controles de acceso funcionan en una compilación de producción.

**Avance de etapa 8:** 54 pruebas aprobadas, build correcto, lectura pública real y cuatro scripts SQL con ROLLBACK verificados. Mejorados contraste y metadatos. Los puntos sin marcar conservan ensayos reales pendientes: navegador/dispositivos, cuentas/correo, fotos, apertura de WhatsApp y dominio público. Evidencia y pasos en `VERIFICACION_ETAPA_8.md`. No se publicó el sitio.

## Etapa 9 — Publicar y documentar

- [ ] 9.1 Elegir alojamiento del frontend y configurar dominio y HTTPS.
- [ ] 9.2 Configurar variables de entorno del sitio publicado.
- [ ] 9.3 Configurar redirecciones para que las rutas de React funcionen al abrirlas directamente.
- [ ] 9.4 Configurar URLs permitidas de autenticación y recuperación de contraseña en Supabase.
- [ ] 9.5 Cargar y revisar el contenido real del negocio.
- [ ] 9.6 Definir copias de seguridad de la base de datos y los archivos, y comprobar cómo restaurarlas según el plan contratado.
- [ ] 9.7 Revisar límites de uso y costos del alojamiento y Supabase.
- [ ] 9.8 Repetir el recorrido público y administrativo sobre el dominio final.
- [ ] 9.9 Escribir una guía breve para agregar productos y actualizar precios, fotos y disponibilidad.
- [ ] 9.10 Actualizar los documentos del proyecto con la arquitectura y las reglas implementadas.

**Resultado:** catálogo disponible en su dominio y preparado para mantenimiento.

## Pendientes para versiones futuras

- [ ] Solicitudes de impresión personalizada con archivos 3D.
- [ ] Favoritos y cuentas de clientes.
- [ ] Gestión de pedidos y seguimiento de cotizaciones.
- [ ] Sincronización del carrito entre dispositivos mediante cuentas de clientes.
- [ ] Pagos online.
- [ ] Gestión de envíos.
- [ ] Productos con varias categorías o variantes multicolor.

## Registro de trabajo

Al terminar cada sesión, anotar lo realizado y la próxima tarea para retomar sin perder el orden.

| Fecha | Tarea | Resultado o bloqueo | Próximo paso |
|---|---|---|---|
| 2026-11-04 | Etapa 2 autorizada por el usuario | Base React/Vite/JavaScript con Router, Tailwind y shadcn/ui, estilos de Mostacho, rutas y estados vacíos; Git inicializado y README creado. Dependencias instaladas y compilación correcta; servidor y entrega HTTP verificados. | Revisar visualmente en computadora y celular; conservar pendientes de etapa 1 y productos aplazados. |
| 2026-11-04 | Etapa 1: identidad y categorías | Confirmados Mostacho 3D, celeste y blanco y alta de categorías desde administración. Carpeta `public/logo/` preparada; logo y fotos aplazados. Respuestas en `DEFINICIONES_ETAPA_1.md`. | Elegir estilo visual y continuar la entrevista. |
| 2026-11-04 | Etapa 1: estilo visual | Confirmado estilo minimalista y cercano con pequeños detalles divertidos. Registrado en `DEFINICIONES_ETAPA_1.md`. | Definir presentación, público y contacto. |
| 2026-11-04 | Etapa 1: público y contacto | Registrados público general, propuesta de impresión de ideas, WhatsApp, Instagram y retiro coordinado en San Miguel de Tucumán. Horarios pendientes. | Definir atención, categorías y primeros productos. |
| 2026-11-04 | Etapa 1: contenido aplazado | El usuario aplaza los productos iniciales; las imágenes continúan aplazadas. No se completan las tareas de contenido. | Continuar con atención, páginas, administradores y reglas generales. |
| 2026-11-04 | Etapa 1: administración compartida | Confirmado que habrá otras personas administrando. Cantidad y permisos pendientes. | Definir permisos iguales o diferenciados. |
| 2026-11-04 | Etapa 1: administradores definidos | Serán dos administradores: el usuario y una persona más, ambos con acceso administrativo al catálogo. Mecanismo de autorización y diagrama pendientes. | Confirmar atención y páginas; continuar con reglas de acceso y publicación. |

## Referencias técnicas

Consultar la documentación vigente antes de implementar la integración:

- [React con Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs).
- [Permisos por fila con RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Claves publicables y secretas](https://supabase.com/docs/guides/getting-started/api-keys).
- [Control de acceso a Storage](https://supabase.com/docs/guides/storage/security/access-control).


### Sesión de etapa 3 — 2026-11-04

Implementados búsqueda, filtro, destacados, detalle con variantes y cantidad, carrito persistente, totales y resumen de WhatsApp con alternativa para copiar. Las fotos siguen aplazadas y no se enviaron mensajes. Próximo paso: prueba manual del recorrido en computadora y celular e incorporación de contenido cuando se autorice.


### Sesión de etapa 4 — 2026-11-04

Creado proyecto aislado de desarrollo en santithomas/São Paulo, costo cotizado USD 0 aceptado. Seis tablas comerciales y dos privadas con RLS; migraciones locales/remotas alineadas, triggers de fechas y publicación, ejemplo en borrador y dos correos autorizados. Pruebas SQL y asesor de seguridad correctos. Pendiente 4.6: alta oficial de ambas cuentas Auth; el conector no dispone de esa operación. No se alteró Lubricentro ni se conectó React a Supabase.


### Sesión de etapa 5 — 2026-11-04

Verificadas las dos cuentas administrativas confirmadas; se resuelve el pendiente de altas de 4.6. Bucket privado y permisos de imágenes aplicados; tablas migradas a rutas de Storage. Servicios de optimización, carga, firma y limpieza preparados, y respaldo SVG incorporado. Pruebas correctas. Fotos reales, optimización en navegador e integración de la pantalla administrativa siguen pendientes. El asesor señaló protección contra contraseñas filtradas desactivada: detalle en SUPABASE_ETAPA_5.md.


### Ajuste comercial — 2026-11-04

El usuario confirma producción por pedido sin stock y publicaciones con precio fijo o «Acordar con el vendedor». Se adaptaron Supabase, tarjetas, detalle, carrito y mensaje de WhatsApp. El subtotal conocido excluye los importes a cotizar. Se conservó la columna histórica de stock sin uso funcional. Migración aplicada y pruebas de precios, permisos y Storage correctas; build correcto. Próximo paso: integrar Supabase y posteriormente los formularios administrativos con las dos modalidades de precio.


### Etapa 6 — 2026-11-04

Conectados inicio, catálogo, detalle y carrito a Supabase mediante un cliente único con versión fijada. Variables públicas en .env.local ignorado por Git y ejemplo sin claves reales. Consultas paginadas y filtradas, URLs de imágenes temporales renovables y revalidación del carrito antes de WhatsApp. No se publicaron productos ficticios. Verificaciones HTTP reales, pruebas de lógica/contratos/React y compilación correctas. Próximo paso: etapa 7, login y mantenimiento administrativo.


### Etapa 7 — 2026-11-04

Implementado el panel de administración conectado a Supabase: login/logout, comprobación de rol, formularios y galería, precio fijo/a acordar sin stock, limpieza por rutas y confirmaciones. RPC de autorización y orden atómico de imágenes aplicados y probados con fixtures revertidos. Las escrituras usan campos permitidos y controlan cambios simultáneos. 44 pruebas correctas y compilación verificada. Próximo paso: etapa 8 con pruebas reales de ambos accesos, redirecciones/correo, fotos y dispositivos.

### Etapa 8 — 2026-11-04

Verificación automática y de permisos reales realizada; 54 pruebas y build correctos. Agregados recorridos con dos productos, carrito largo, persistencia/almacenamiento bloqueado y catálogo paginado de 35 productos simulados. Corregidos contraste de controles y metadatos por ruta. Etapa abierta para pruebas reales detalladas en VERIFICACION_ETAPA_8.md.

### Preparación para GitHub — 2026-11-05

Preparados índice y remoto `https://github.com/Santhomas1/catalogo_mostacho.git` (sin ramas al consultar). Agregados CI de pruebas/build sin credenciales reales, atributos de finales de línea y exclusiones para archivos locales/respaldos. Retirados correos personales del bootstrap histórico local, sin ejecutar cambios remotos ni alterar accesos. 54 pruebas y build aprobados; detalle del bloqueo local de npm ci y comandos de primera subida en PREPARACION_GITHUB.md. Sin commit, push ni despliegue.

### Adaptación para celular — 2026-11-05

Ajustados estilos para pantallas de hasta 640 px: catálogo en una columna, controles táctiles de al menos 44 px, campos a 16 px para evitar el zoom automático de iOS, carrito con cantidad/subtotal separados, botones que admiten texto en varias líneas y pestañas administrativas en dos columnas. Mejorados espacios de inicio/contacto, galería desplazable y contención de nombres/SKU largos. 55 pruebas y build correctos. El host de navegador no estuvo disponible; siguen pendientes la inspección visual a 360/390/640 px, zoom y teclado real. Cambio local, sin commit ni push en esta sesión.

### Configuración PWA — 2026-11-05

Preparados manifest, iconos normal/maskable/iOS, invitación de instalación, service worker de producción y pantalla offline sin caché de datos comerciales o sesiones. Configuradas rutas y cabeceras de Vercel. 61 pruebas y build correctos; detalles y ensayo de instalación pendiente en PWA_MOSTACHO.md. No se hizo commit, push ni despliegue en esta sesión.
