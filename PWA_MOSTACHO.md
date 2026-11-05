# PWA de Mostacho 3D

Configuración local del 2026-11-05. Sin dependencias nuevas ni cambios a Supabase.

## Qué se agregó

- Manifest con identidad estable `/`, nombre Mostacho 3D, inicio `/`, idioma es-AR, colores de marca y apertura `standalone`. No bloquea la orientación.
- Iconos PNG de 192 y 512 px, uno maskable de 512 px con margen seguro y apple-touch-icon de 180 px. Generados desde el logo existente, sin deformarlo. Se pueden regenerar en Windows con `./scripts/generate-pwa-icons.ps1`; no se requiere ese script para compilar en Vercel.
- Botón «Instalar Mostacho» visible en la página tanto en celular como en computadora. Si el navegador entrega `beforeinstallprompt`, abre el diálogo nativo; de lo contrario muestra instrucciones al pulsarlo (incluida alternativa en Firefox de escritorio e instrucciones de Compartir en iPhone/iPad). Si ya se abrió como aplicación independiente, la invitación no aparece. No se garantiza que todos los navegadores entreguen el evento ni que lo hagan en la primera visita.
- Registro de `/sw.js` solo en producción y contexto seguro. El desarrollo con `npm run dev` no registra un worker nuevo.
- Pantalla pública sin conexión con opción de reintentar. Solo ese HTML se guarda en Cache Storage. No se guarda el HTML de las rutas, el catálogo, precios, JWT, consultas de Auth/API, fotos ni URLs firmadas. Los datos y operaciones del negocio necesitan Internet. Una pestaña ya abierta conserva sus propios estados de carga/error habituales; la pantalla offline aparece al intentar navegar o recargar sin red después de haber instalado el worker con conexión.
- El worker nuevo se activa sin recargar forzosamente formularios abiertos. No cachea bundles: las nuevas visitas consultan la versión publicada. Al modificar `offline.html`, incrementar la versión de caché en `public/sw.js` para renovar la copia. Eliminar únicamente cachés con prefijo `mostacho-offline-`.
- `vercel.json` da cabeceras de actualización al worker/manifest y reescribe rutas sin extensión a `index.html`; los archivos PWA, iconos y bundles con extensión se entregan como archivos. No crea un despliegue por sí mismo.

## Publicar e instalar

1. Subir estos cambios al repositorio y esperar que Vercel termine el despliegue. Mantener las variables de Supabase y configurar `VITE_SITE_URL` con el origen HTTPS final. No hacen falta claves ni variables nuevas para PWA.
2. Abrir la URL HTTPS final directamente en el navegador, fuera del visor integrado de Instagram/WhatsApp. Verificar que `/manifest.webmanifest` sea JSON y `/sw.js` JavaScript, no HTML ni 404.
3. Android: usar un navegador compatible, como Chrome, y elegir «Instalar Mostacho» cuando aparezca o buscar la instalación en su menú. La disponibilidad y el nombre del menú dependen del navegador.
4. iPhone/iPad: desde Safari, Compartir → Agregar a la pantalla de inicio, y abrir como aplicación web si se ofrece esa opción.
5. Confirmar el icono en inicio y abrir desde él: debe iniciar Mostacho sin la barra de dirección cuando el navegador admita `standalone`.

La instalación requiere HTTPS, salvo localhost/127.0.0.1. La dirección HTTP de la computadora en Wi-Fi sirve para revisar el diseño, pero no para validar la instalación PWA desde el celular. Firefox de escritorio permite probar la web y el diseño adaptable, pero no la instalación por manifest.

## Verificar cambios

```sh
npm test
npm run build
npm run preview
```

Abrir el localhost del preview en un navegador compatible. En las herramientas de desarrollo, revisar Manifest y Service Workers; esperar a que el worker esté activado antes de probar sin red. No confundir esta prueba con `npm run dev`, donde no se registra.

Lista pendiente en dispositivos/dominio real:

- Instalar y abrir en Android e iOS; revisar icono normal/maskable y pantalla de inicio.
- Probar navegación directa a `/catalogo`, un producto y `/admin` sin 404 del hosting.
- Después de una visita con conexión, activar modo avión y recargar: debe mostrar el aviso genérico sin productos, precios ni datos privados. Restaurar conexión y reintentar.
- Confirmar que el carrito guardado reaparece y se revalida al volver; el worker no borra localStorage.
- Publicar una actualización de prueba y volver a abrir con conexión para comprobar renovación sin perder formularios o selección. No usar «Borrar todos los datos del sitio» para probar, porque también eliminaría el carrito/sesión.

## Evidencia de esta sesión

65 pruebas aprobadas y build correcto. Preview de producción comprobado por HTTP: inicio, catálogo, admin, manifest, worker, pantalla offline y los cuatro iconos responden 200 con los tipos esperados. El manifest servido se verificó adicionalmente con fetch/JSON de Node; nombre Mostacho 3D correcto. Servidores de comprobación detenidos. Pruebas nuevas de manifest/tamaños PNG, instalación y limpieza de caché, navegación online/offline, exclusión de API/archivos/escrituras, registro seguro y patrones de rutas Vercel. El ícono de 512 px se inspeccionó como imagen local. La ejecución del worker se verificó con un contexto simulado; no equivale a instalarlo en un navegador real. El entorno no dispone de acceso operativo al navegador, por lo que instalación, modo avión y cabeceras del dominio publicado quedan pendientes.

Fuentes primarias: [Instalación PWA (MDN)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [Service Workers (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [Configuración Vercel](https://vercel.com/docs/project-configuration/vercel-json).

Pruebas del botón: visible sin evento nativo, ayuda en Firefox e iPhone, diálogo nativo y ocultamiento tras instalar/abrir en modo independiente. El botón no puede ampliar las capacidades del navegador.
## Icono de inicio en iPhone

El HTML declara un PNG de 180×180 en `/apple-touch-icon.png?v=2`; la copia sin parámetros en la raíz permite el descubrimiento convencional de iOS. El generador mantiene esta copia sincronizada con `/pwa/apple-touch-icon.png`. El parámetro de versión cambia la URL respecto del icono anterior.

Si una instalación anterior muestra una letra, después de publicar el cambio quitá ese acceso de inicio, abrí el sitio actualizado en Safari y usá Compartir → Agregar a inicio. La comprobación local no confirma el resultado en un iPhone ni que el despliegue público incluya estos archivos.

## Conversión de imágenes al subir

El administrador convierte las imágenes a WebP antes de subirlas. Admite los formatos que el navegador pueda decodificar (JPEG, PNG, WebP, GIF, AVIF, BMP y otros), y agrega un decodificador HEIC/HEIF para fotos de iPhone cuando falta soporte nativo. También reconoce archivos `.heic` y `.heif` sin tipo MIME.

Se mantienen los límites de 50 MB por original, 1600 píxeles en el lado mayor y 5 MB por WebP final. Las imágenes animadas se guardan como una foto estática. Los archivos dañados o formatos sin decodificador disponible, como ciertos RAW o TIFF, muestran un error y no se suben.

El decodificador `heic-to` se carga bajo demanda; documentación: https://github.com/hoppergee/heic-to. Las pruebas automatizadas cubren el flujo de conversión con un decodificador simulado; queda pendiente verificar fotos reales desde un iPhone.

Si el navegador devuelve PNG al pedir WebP, devuelve un archivo vacío o falla la exportación de canvas, se carga bajo demanda `@jsquash/webp` y se codifican los píxeles con WebAssembly. Vite publica ambos binarios (con y sin SIMD) mediante URLs de assets. No se cambia la extensión de un PNG: el resultado es WebP real. El error de tamaño se muestra únicamente si el WebP generado supera 5 MB; un fallo del codificador muestra un mensaje diferente.

La regresión comprueba exportación nativa a PNG/null/error, uso del codificador alternativo, rechazo de resultados inválidos y conservación de la subida WebP. También ejecuta el codificador WASM real y verifica la cabecera RIFF/WEBP del archivo resultante. La carga desde Safari/iPhone queda pendiente de comprobación en dispositivo.
