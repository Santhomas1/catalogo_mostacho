# Preparación para GitHub

Fecha: 2026-11-05. Preparación del repositorio; no equivale a publicar la página.

## Archivos que se versionan

Código, recursos de marca, package.json y package-lock.json, pruebas, migraciones, documentación y `.env.example` con valores de ejemplo. `.gitignore` excluye `.env.local`, dependencias, build, logs, volcados de base de datos y claves privadas. No subir respaldos, exportaciones de usuarios ni enlaces con tokens de invitación/recuperación.

Los datos de contacto comercial (WhatsApp e Instagram) y el logo son públicos por diseño. Los documentos históricos conservan referencias al proyecto de desarrollo de Supabase; esas referencias identifican el proyecto, pero no son credenciales. No se añadieron licencias de uso del código o de la marca sin decisión del propietario.

## Accesos de Supabase

Se retiraron los dos correos personales de la copia local de `20261104144535_datos_desarrollo_y_accesos.sql`. Es la única adaptación de privacidad de esa migración histórica: conserva las políticas y los datos de ejemplo, pero deja de autorizar personas automáticamente en instalaciones nuevas. No volver a aplicarla al proyecto existente, ni resetear la base, ni modificar su historial remoto para esta preparación. Los accesos actuales no cambian.

En un proyecto nuevo, el propietario debe autorizar el correo desde una conexión SQL privilegiada y fuera de Git; después crear/invitar la cuenta por el flujo oficial de Auth. Si la cuenta ya existe y tiene correo confirmado, también se debe agregar su UUID a `private.administradores`. Ambas tablas deben estar activas para autorizar. No colocar correos reales en una migración nueva ni usar `user_metadata` para otorgar roles. Los archivos operativos que se escriban localmente pueden terminar en `.sql.local` para permanecer excluidos de Git.

## Comprobación automática

`.github/workflows/ci.yml` ejecuta `npm ci`, `npm test` y `npm run build` en cada push o pull request, y admite ejecución manual. Usa Node.js 22, permisos de lectura y valores ficticios de Supabase. No necesita secretos de GitHub, no consulta la base real, no aplica migraciones y no despliega el sitio. La ejecución remota solo se podrá verificar después de subir el repositorio.

Referencias: [GitHub Actions](https://docs.github.com/en/actions/get-started/quickstart) y [setup-node](https://github.com/actions/setup-node).

## Primera subida

Destino configurado como `origin`: https://github.com/Santhomas1/catalogo_mostacho.git. GitHub devolvió una lista vacía de ramas durante esta revisión. El repositorio local todavía no tiene commits; los archivos revisados están preparados en el índice. Para hacer la primera subida:

```sh
git status
git diff --cached --check
git diff --cached --stat
git commit -m "Preparar catálogo Mostacho 3D"
git branch -M main
git remote -v
git push -u origin main
```

`origin` ya está configurado; no hace falta agregarlo otra vez. Si GitHub contiene commits, inspeccionar y conciliar el historial primero; no forzar el push. Si Git solicita identidad, configurar el nombre y correo elegidos por el propietario, sin inventarlos.

En otra computadora: clonar, copiar `.env.example` a `.env.local`, completar URL y clave publicable de Supabase, ejecutar `npm ci` y `npm run dev`. Para desplegar se configurarán esas variables y `VITE_SITE_URL` en el alojamiento, no dentro del repositorio.

Las pruebas reales todavía pendientes de la etapa 8 siguen en `VERIFICACION_ETAPA_8.md`.

## Verificación local de esta preparación

54 pruebas aprobadas, build correcto y revisión del índice sin errores de espacios, sin archivos de entorno reales y sin los patrones de claves secretas/correos personales comprobados. El lockfile no cambió. `npm ci` encontró un binario nativo bloqueado por Windows; `npm install` restauró la instalación (auditoría: cero vulnerabilidades) y después pasaron pruebas y build. La instalación limpia con `npm ci` en Linux y la ejecución del workflow aún deben comprobarse en GitHub. No se creó un commit ni se realizó push.
