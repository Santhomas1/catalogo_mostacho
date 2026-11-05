# Verificación — Etapa 8

Fecha: 2026-11-04. Proyecto Mostacho 3D, entorno local y Supabase de desarrollo `dthsrdgvrkoxxqwotedd`.

La verificación automática pasó. La etapa continúa abierta para los ensayos con navegador, cuentas, correo y fotos reales. Este informe no acredita una revisión visual, una auditoría completa de seguridad ni un ensayo de carga.

## Evidencia obtenida

- `npm test`: **54 pruebas aprobadas**, cero fallos, omitidas o canceladas. Incluye servicios, lógica y componentes React con transporte simulado. Los productos de estos ensayos existen únicamente en memoria.
- `npm run build`: correcto. JavaScript gzip: aplicación 35,05 kB, Supabase 59,50 kB y React/router 83,59 kB; CSS 6,22 kB. Son tamaños de archivos, no tiempos de carga medidos.
- `node --env-file=.env.local scripts/check-supabase.mjs`: lectura pública real correcta, catálogo vacío, filtros/paginación correctos, borrador y slug inexistente ocultos, variantes inexistentes ausentes.
- Ejecutados contra Supabase los cuatro scripts de `supabase/tests/`: permisos y reglas, Storage, precios por pedido y panel administrativo. Todos devolvieron OK y terminaron con ROLLBACK. Las pruebas de Storage verifican permisos sobre metadatos sintéticos dentro de la transacción; no reemplazan una carga física de fotos mediante navegador.
- Estado remoto posterior: un producto de ejemplo privado, cero productos publicados, cero archivos en el bucket y dos cuentas Auth. No quedaron fixtures publicados.
- Compilación servida por Vite preview en 127.0.0.1:4173: inicio, catálogo, contacto, carrito, admin y ruta de producto devolvieron HTML; favicon SVG y logo PNG devolvieron sus formatos correctos. Servidor de comprobación detenido al terminar. Esto verifica entrega HTTP, no ejecución visual de React. La ruta inexistente recibe el HTML SPA con 200: el hosting/SSR deberá resolver los códigos HTTP si se necesitan 404 reales.
- `.env.local` continúa ignorado por Git. No se instalaron dependencias nuevas para esta etapa.

## Cobertura por tarea

| Tarea | Resultado y límite |
|---|---|
| 8.1 | Recorrido completo en componentes: catálogo, detalle, cantidad, carrito, seguir eligiendo, segundo producto y enlace único de WhatsApp. Falta abrir y revisar ese enlace en un navegador/dispositivo real; no se enviaron mensajes. |
| 8.2 | Sin fotos, variantes inactivas/no disponibles, producto oculto y precios fijo/a acordar verificados en componentes y lógica. |
| 8.3–8.4 | Permisos reales mediante SQL con roles anon/authenticated, cuenta sin rol, metadata falsa y administrador; privacidad de hijos, revocación y Storage verificados. |
| 8.5 | Componentes verifican acceso denegado, acceso autorizado, logout, errores y formularios de recuperación. Pendientes login real de las dos cuentas, entrega del correo, redirección y cambio efectivo de clave. |
| 8.6 | Verificados matemáticamente los pares de colores cubiertos por `metadata.test.js`; mejorados bordes y foco. Pendiente revisión visual, orden del foco, zoom y teclado en celular/tablet/computadora. No se afirma conformidad WCAG global. |
| 8.7 | Paginación de 35 productos simulados en páginas de 12 y carrito de 60 líneas aprobados. Faltan imágenes reales, medición de carga y rendimiento en red/dispositivos. |
| 8.8 | Metadatos implementados y decisión de renderizado documentada abajo. Falta dominio final, URL absoluta en HTML y comprobar vista previa pública. |
| 8.9 | Suite completa y compilación de producción aprobadas. No hay script de lint configurado. |
| 8.10 | Corregidos contraste y metadatos; pendientes de publicación identificados. Sigue abierto mientras falten los ensayos y configuración señalados. |
| 8.11 | Variantes repetidas, cantidades inválidas, eliminar líneas y vacío aprobados. |
| 8.12 | Remontar componentes restaura identificadores/cantidades; almacenamiento corrupto o bloqueado mantiene la visita utilizable. Falta recarga real en el navegador. |
| 8.13 | Revalidación de importes/modalidad, producto retirado, fallos y reintentos, subtotal mixto sin convertir cotizaciones a cero aprobados. |
| 8.14 | Resumen único con varios productos, cantidades, subtotales, total conocido, acentos y caracteres especiales aprobado. |
| 8.15 | Resumen largo bloquea enlace excesivo, ofrece copia completa y alternativa manual si falla portapapeles; selección conservada. Falta comprobar apertura de WhatsApp y portapapeles reales. |

## Correcciones y metadatos

Se agregó `PageMetadata` con títulos y descripciones por ruta/producto, noindex del panel, carrito y páginas no disponibles, y etiquetas Open Graph/Twitter. Las URLs se forman con el origen y pathname, sin copiar parámetros ni tokens de recuperación. La imagen social usa el logo público estable, nunca una URL firmada temporal de Storage.

`VITE_SITE_URL` queda opcional y vacío en `.env.example`: antes de publicar se debe definir el origen HTTPS real, sin rutas, para que el build escriba la imagen social absoluta en el HTML inicial. No se inventó un dominio. El logo actual pesa aproximadamente 1,04 MB; su composición y legibilidad social todavía necesitan inspección visual.

**Decisión:** conservar la SPA para las pruebas de esta versión. Antes de prometer vistas previas individuales de cada producto en WhatsApp, incorporar prerenderizado o SSR que entregue título/descripción/imagen de ese producto en el HTML inicial y contemple invalidación al ocultarlo o editarlo. El HTML actual entrega metadatos generales; actualizarlos con JavaScript no garantiza que todos los robots sociales los lean. Si se acepta una vista previa general de marca para todos los enlaces, no hace falta migrar de arquitectura para esa función básica, pero hay que validarla sobre el dominio público.

Referencias primarias: [SEO de JavaScript de Google](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) y [Open Graph](https://ogp.me/).

## Pendientes para completar la etapa

1. Con cada administrador: iniciar sesión en `/admin`, cerrar sesión y probar recuperación real; revisar las URLs permitidas de Auth según `SUPABASE_ETAPA_7.md`. Nunca compartir claves en el chat.
2. Crear un borrador real, cargar una foto, revisar optimización y galería, probar variantes fija/a acordar, publicar cuando el contenido esté aprobado y comprobar visibilidad pública. Ocultar antes de eliminar. No publicar la maceta ficticia.
3. En anchos aproximados de 360, 768 y 1280 px: recorrer con teclado, verificar foco, etiquetas, errores, menú, tarjetas, galería y carrito; revisar zoom 200 % y ausencia de recortes. Ensayar WhatsApp sin enviar al negocio y comprobar que la selección se conserva al volver.
4. Medir imágenes y tiempos con contenido real y red móvil. Revisar metadatos en la URL pública tras configurar dominio; esto se coordina con etapa 9.
5. Revisar el aviso vigente de Supabase: [protección contra contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). El conector disponible no permite configurar esa opción de Auth; no se cambió automáticamente ni se verificó disponibilidad según el plan.

El control de navegador informó que el host de acceso no está disponible. Por ello no se pudieron ejecutar los ensayos visuales y de dispositivo desde esta sesión. No se inició la publicación.
