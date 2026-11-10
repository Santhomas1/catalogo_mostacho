# Revisión integral de Mostacho

Fecha: 9 de noviembre de 2026.

## Alcance y decisiones conservadas

Revisión de las páginas públicas, catálogo, filtros, fichas, galería, carrito, instalación PWA, acceso y formularios administrativos, servicios, autenticación, estilos y pruebas. Inspección estática de las migraciones y las políticas de acceso versionadas.

Se conservan las rutas, las consultas a Supabase, las modalidades de precio, las validaciones, la publicación con imagen obligatoria y las confirmaciones de eliminación. No se modificaron permisos, credenciales, esquema ni datos remotos. No se desplegó ni se realizó ningún envío por WhatsApp.

Se mantienen los últimos cambios solicitados: contacto con tres tarjetas y contenido centrados; inicio con Destacados sin categorías; frase «Encontrá tu próxima idea favorita.»; eliminación del botón «Hablemos de tu idea».

## Problemas corregidos

| Impacto | Problema | Corrección y evidencia |
| --- | --- | --- |
| Medio | Dos revalidaciones del carrito podían compartir `Date.now()` y mantener habilitado un mensaje con precios anteriores. | Cada consulta tiene una revisión única. La prueba con reloj congelado falló antes del cambio y pasa después; una actualización invalida el enlace preparado. |
| Medio | Las animaciones ocultaban secciones completas y exigían un 6 % de intersección, un porcentaje que una página larga puede no alcanzar en móvil. | Se animan bloques visuales acotados con umbral cero. Sin observador o con movimiento reducido, el contenido permanece visible. Pruebas de entrada, actualización y limpieza. |
| Medio | Al navegar desde el menú, se intentaba enfocar el contenido mientras seguía inerte; el cierre podía terminar devolviendo el foco al botón del menú. | La nueva página recibe foco después de restaurar el fondo. Prueba de orden de efectos, foco y ausencia de desplazamiento al abrir el menú. |
| Bajo | Los títulos de productos destacados competían semánticamente con el título de su sección. | Destacados usa h2 y sus productos h3; las tarjetas del catálogo conservan h2. |
| Bajo | Las acciones repetidas del carrito carecían de contexto para lectores de pantalla. | Etiquetas de cantidad y eliminación incluyen el nombre del producto; el campo de cantidad de la ficha comunica invalidez y ayuda. |
| Bajo | Los estados hover podían quedar activos tras tocar una tarjeta o botón. | Se eliminan desplazamientos hover en dispositivos sin hover; se respeta movimiento reducido también al pulsar. |
| Medio | El color global de enlaces prevalecía sobre la utilidad Tailwind del botón principal: el texto quedaba oscuro sobre fondo oscuro. | Se identifican las variantes con `data-variant` y se declaran sus colores en el tema. Problema observado a 320 px y comprobado visualmente después de corregirlo, también en enlaces de contacto y ficha. |
| Pruebas/documentación | Dos pruebas y el README todavía prohibían el carrito para productos sin variantes, aunque la función ya estaba implementada. | Las pruebas ahora recorren agregado, persistencia, revalidación y preparación de WhatsApp para precio fijo y a acordar. Se actualizó el README sin retirar la función. |

## Verificación ejecutada

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 82 pruebas aprobadas; 0 fallas. Incluye recorridos, permisos simulados, errores de red, precios, publicación, imágenes, PWA, metadatos, contraste, menú y animaciones. |
| `npm run build` | Compilación correcta. Advertencia por el tamaño del conversor HEIC cargado bajo demanda. |
| `npm audit --json` | 0 vulnerabilidades conocidas reportadas, incluyendo dependencias de desarrollo. No es una certificación de seguridad. |
| `npm audit --omit=dev --json` | 0 vulnerabilidades conocidas de producción. |
| `node --env-file=.env.local scripts/check-supabase.mjs` | Consultas reales de solo lectura correctas: 39 productos públicos, 12 en la primera página y 10 categorías; filtros, paginación, slugs inexistentes/ocultos y variantes inexistentes comprobados. |

## Revisión visual en navegador integrado

Se utilizó emulación de dimensiones en la vista previa de VS Code, con altura de 800 px. No se usaron datos ficticios en el catálogo público.

| Pantalla | Dimensiones revisadas | Observación |
| --- | --- | --- |
| Inicio | 320 px y vista previa de escritorio | Lectura, botón principal corregido y menú móvil. |
| Contacto | 320, 768, 1024 y 1440 px | Tarjetas y contenido centrados; apilado en móvil/tablet y tres columnas desde 1024 px. |
| Catálogo | 1440 px | Productos reales, etiquetas de filtros, contador y fotografías. |
| Ficha de producto | 320 y 1440 px | Galería, precio, consulta directa y agregado local al carrito. |
| Carrito | 320 px | Cantidad, subtotal, preparación de consulta y habilitación posterior del enlace. Se agregó un producto real de prueba y después se retiró, dejando el carrito vacío como al comenzar. No se envió ningún mensaje. |
| Acceso administrativo | 320 px | Formulario y botón legibles; no se ingresaron credenciales. |

## Límites de la evidencia

- Las pruebas de componentes usan el SDK con transporte simulado; no sustituyen una comprobación visual en un navegador real.
- No se recorrieron todas las combinaciones de pantalla y tamaño. Quedan pendientes el zoom al 200 %, la prueba con lector de pantalla, navegadores adicionales y dispositivos físicos. Los estilos y los controles de teclado tienen inspección y pruebas específicas.
- No se ejecutaron escrituras ni pruebas SQL contra la base remota. Las políticas versionadas fueron inspeccionadas; no se certifica que todo el estado remoto coincida con ellas.
- No se probaron inicio de sesión real, recuperación por correo, cambios de contraseña, carga/borrado de archivos reales ni instalación en un teléfono físico.
- No se midieron Core Web Vitals. El conversor HEIC es un bloque grande, pero su importación es dinámica y no forma parte de la carga inicial del catálogo.

Veredicto: comprobaciones automáticas, consultas públicas y los recorridos visuales descritos aprobados; validación de accesibilidad y dispositivos parcial.
