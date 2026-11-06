# Mostacho 3D

Catálogo de impresiones 3D para San Miguel de Tucumán: React y JavaScript con Vite, React Router, shadcn/ui y Tailwind CSS. Datos, autenticación y archivos en Supabase. No utiliza Express.

## Ejecutar

Requiere Node.js 22.12 o posterior y npm.

```sh
npm ci
npm run dev
```

Abrir la dirección indicada por Vite, normalmente http://127.0.0.1:5173.

La conexión local ya está configurada en `.env.local`, que está excluido de Git. En otra computadora, copiar `.env.example` a `.env.local` y completar:

```dotenv
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_reemplazar
```

La clave publicable es visible en el navegador y depende de RLS para limitar el acceso. Nunca usar claves secretas o `service_role` en variables `VITE_`. Reiniciar Vite al cambiar variables. El alojamiento deberá tener las mismas variables durante el build.

```sh
npm run build
npm run preview
```

`build` genera `dist/`. El alojamiento debe servir `index.html` en las rutas de React.

## Estado actual

Inicio, catálogo, detalle y carrito consultan Supabase. La búsqueda, categorías y paginación se resuelven en el servidor. El carrito revalida variantes y precios al recuperar y antes de preparar WhatsApp. Los productos se realizan por pedido, sin stock; sus variantes admiten precio fijo o «Acordar con el vendedor». El subtotal conocido excluye las opciones sin importe.

La maceta ficticia ya no se importa en la web y su registro remoto sigue en borrador como ejemplo. **Es normal ver el catálogo vacío hasta que se publiquen productos reales.** No hay un fallback a datos ficticios si falla la conexión. Los archivos antiguos de `src/data/` quedan sin uso en tiempo de ejecución.

El bucket de productos es privado: las URLs duran 60 segundos y se renuevan al consultar las páginas. La carga y mantenimiento de imágenes y el login/panel están implementados en la etapa 7. Las cuentas autorizadas ya pueden utilizar `/admin`. La recuperación de contraseña requiere comprobar las URLs permitidas y el correo real según `SUPABASE_ETAPA_7.md`.

## Pruebas

```sh
npm test
node --env-file=.env.local scripts/check-supabase.mjs
```

El primer comando verifica lógica, contratos del SDK y componentes React con transporte simulado; no sustituye la revisión visual o con teclado en un navegador. El segundo hace consultas reales de solo lectura al proyecto configurado y no publica fixtures. Las pruebas React usan esbuild y react-test-renderer como herramientas de desarrollo; este último informa que está deprecado. Las pruebas SQL en `supabase/tests/` revierten sus fixtures mediante ROLLBACK.

Para una comprobación manual: recorrer inicio/catálogo/contacto; al cargar productos reales, elegir variantes, agregar cantidades, recargar, editar o quitar, preparar la consulta y revisar el mensaje sin enviarlo al negocio. Un error de red debe conservar la selección y ofrecer reintento.

## Archivos principales

- `src/lib/supabase.js`: instancia única del cliente oficial, versión exacta en package.json y lockfile.
- `src/services/catalog-service.js`: consultas públicas, paginación, relaciones y mapeo.
- `src/services/images.js`: optimización a WebP, carga, firma y limpieza para la futura administración.
- `src/components/CartProvider.jsx`: selección persistente y validación remota.
- `src/components/ui/` y `components.json`: componentes shadcn/ui en JavaScript.
- `src/styles/globals.css`: estilos celestes y blancos, adaptados a móvil.
- `public/logo/`: logo y favicon proporcionados por el usuario.
- `public/images/producto-sin-imagen.svg`: respaldo de productos sin foto o con error de carga.
- `supabase/migrations/`: historial local alineado con el remoto. No volver a aplicar migraciones ya ejecutadas al mismo proyecto.

Documentación: `SUPABASE_ETAPA_4.md`, `SUPABASE_ETAPA_5.md`, `SUPABASE_ETAPA_6.md`, `SUPABASE_ETAPA_7.md`, `DIAGRAMA_BASE_DE_DATOS.md` y `TAREAS_DEL_PROYECTO.md`. La implementación sigue siendo local, sin despliegue.


## Mantener el catálogo

Abrir `/admin` e iniciar sesión con una cuenta autorizada. Preparar categorías/materiales/colores, crear un borrador, agregar variantes e imágenes y luego publicar. Las variantes admiten precio fijo o a acordar y plazo opcional, sin stock. Guardar antes de cambiar de sección. Las eliminaciones definitivas requieren confirmación; se prioriza desactivar u ocultar. Para probar recuperación real y configurar sus redirecciones, consultar `SUPABASE_ETAPA_7.md`. No compartir contraseñas en el chat.

## Verificación de primera versión

Consultar `VERIFICACION_ETAPA_8.md`: 54 pruebas automáticas, build y permisos SQL verificados. Continúan pendientes las pruebas reales de navegador, cuentas/correo y fotos. Para los metadatos sociales del HTML inicial, configurar `VITE_SITE_URL` con el origen HTTPS del dominio definitivo y volver a compilar. Las vistas previas individuales de productos necesitan HTML por producto mediante prerenderizado o SSR; el sitio actual entrega una vista previa general de marca.

## Repositorio en GitHub

La preparación y los pasos de primera subida están en [PREPARACION_GITHUB.md](PREPARACION_GITHUB.md). GitHub Actions ejecuta instalación, pruebas y build con datos ficticios, sin conectarse a Supabase ni desplegar. El archivo `.env.local` se configura en cada computadora y permanece fuera de Git. Las migraciones versionadas no incluyen los correos personales de los administradores; el bootstrap privado de una instalación nueva se realiza por separado.

## Aplicación instalable (PWA)

Configuración, instalación en Android/iPhone y comprobaciones en [PWA_MOSTACHO.md](PWA_MOSTACHO.md). Incluye manifest, iconos, registro en producción, invitación de instalación compatible y pantalla sin conexión. El catálogo y la administración siguen necesitando Internet; no se cachean datos de Supabase. Vercel sirve las rutas de React mediante `vercel.json`. No requiere variables de entorno adicionales ni ejecutar migraciones.
## Publicación con campos opcionales

Para publicar se requiere una imagen, además de los datos básicos del producto. Las variantes son opcionales y las instrucciones de cuidado pueden dejarse vacías. Sin variantes, la ficha ofrece consultar el producto y no permite agregarlo al carrito; los cuidados vacíos no se muestran.

La migración `20261105153339_variantes_opcionales_publicacion.sql` actualiza la validación de la base de datos y conserva el requisito de imagen. Ya está aplicada en `mostacho-3d-desarrollo`. Verificación: 71 pruebas JavaScript, compilación y pruebas SQL de publicación/permisos y administración con transacciones revertidas.

El precio de productos sin variantes se edita en **Datos y publicación → Modalidad de precio del producto**. Permite precio fijo (ARS por defecto) o acordar con el vendedor. Las variantes conservan sus propios precios y tienen prioridad al mostrarse. La consulta por WhatsApp sigue disponible para productos sin variantes, incluso con precio fijo.

La migración `20261106122836_precio_producto_sin_variantes.sql` agrega los campos y valida el importe y la moneda. Aplicada en `mostacho-3d-desarrollo`; verificada con `supabase/tests/precio_producto.sql` (ROLLBACK), 75 pruebas JavaScript y la comprobación del catálogo público.
