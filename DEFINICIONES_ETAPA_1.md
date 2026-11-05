# Definiciones — Etapa 1

Actualizado: 2026-11-04. Entrevista en curso; ninguna tarea se considera completa sin resolver sus pendientes.

## Decisiones confirmadas

### 1.1 Identidad

- Nombre comercial: **Mostacho 3D**.
- Colores de marca: **celeste y blanco**. Tonos exactos por definir.
- Logo proporcionado por el usuario: `public/logo/mostacho.png`, incorporado en el encabezado y el pie de página. Favicon proporcionado: `public/logo/favicon-mostacho.svg`.
- Estilo visual confirmado: **minimalista y cercano, con pequeños detalles divertidos que le den personalidad a Mostacho 3D**.
- Público principal: público general.
- Propuesta del negocio: realizar impresiones 3D a partir de las ideas de los clientes que se puedan imprimir.
- Las consultas personalizadas podrán conversarse por WhatsApp; esto no incorpora un formulario de carga de archivos 3D al alcance de esta versión.

### 1.2 Contacto

- WhatsApp público: **+54 9 381 679-5568**. Número para enlaces: `5493816795568`.
- Instagram público: **@mostacho.3dprints**. Enlace: https://www.instagram.com/mostacho.3dprints/
- Localidad de trabajo: **San Miguel de Tucumán**.
- Entrega confirmada: **retiro coordinado**. No se ha indicado una dirección pública ni confirmado otras modalidades.
- Horarios de atención: por definir.

### 1.3 Categorías y productos

- El catálogo tendrá variedad de productos; todavía no hay una lista de categorías iniciales confirmada.
- El administrador debe poder agregar categorías desde el panel, sin editar código. Esta capacidad ya está prevista en el proyecto.
- Productos reales iniciales: **aplazados por decisión del usuario**. Posteriormente autorizó un único producto ficticio para probar las tarjetas: Maceta geométrica, solo en desarrollo y excluida del catálogo de producción. Sus precios y variantes son ilustrativos, no decisiones comerciales.

### 1.4 Contenido y variantes

Descripciones, cuidados y variantes concretas se completarán cuando el usuario decida incorporar productos. Las fotos de ejemplo siguen aplazadas por decisión del usuario. Esto no impide definir ahora las reglas generales del catálogo.

### 1.5 Condiciones comerciales

- Confirmado por el usuario: todos los productos se realizan **por pedido**, sin gestión de stock.
- Cada variante puede publicarse con **precio fijo** o con **«Acordar con el vendedor»**, según si el tamaño u otras características requieren cotización. Se pueden configurar todas las variantes de una publicación con la misma modalidad.
- Los precios a acordar no tienen importe ni moneda en la base; no se representan como cero. En carritos mixtos, se informa el subtotal conocido y se aclara que el total final queda pendiente de cotización.
- El plazo de producción puede quedar a coordinar. Moneda comercial y precios reales siguen pendientes; ARS en la maceta continúa siendo solo un ejemplo.

### 1.6 Páginas

Pendiente confirmar con el usuario las páginas previstas en el plan: inicio, catálogo, producto, carrito, contacto y administración.

### 1.7 Administradores

- Habrá **dos administradores en total**: el usuario y una persona más.
- Ambos necesitan acceso de administrador para gestionar el catálogo; no se han solicitado permisos diferenciados.
- Mecanismo implementado en etapa 4: lista privada de correos autorizados y membresía administrativa vinculada a Supabase Auth; solo correos confirmados, sin roles desde metadata editable. La revocación se comprueba en cada operación. Los dos correos proporcionados tienen cuentas reales confirmadas y autorización activa, verificadas al iniciar la etapa 5.
- Diagrama actualizado con Auth y las tablas privadas de autorización. Detalles de autorización en `SUPABASE_ETAPA_4.md`; altas verificadas al iniciar la etapa 5.

### 1.8 Categorías desactivadas

Regla implementada al autorizar la etapa 4: una categoría desactivada oculta sus productos y datos relacionados sin borrarlos. Su aplicación al carrito desde datos remotos corresponde a la etapa 6.

### 1.9 Fotos de borradores

Implementado en etapa 5: bucket privado y lectura según visibilidad del producto. Los borradores solo son accesibles a administradores. Las fotos publicadas usan enlaces temporales de 60 segundos, que pueden seguir funcionando hasta vencer aunque se oculte el producto. La carga de fotos reales continúa aplazada.

## Propuestas sin confirmar

- Aplicación propuesta del estilo elegido: fondo blanco, acentos celestes, textos oscuros legibles, tipografía simple y protagonismo de los productos. Incorporar detalles gráficos divertidos con moderación. Los tonos exactos y los recursos gráficos concretos siguen pendientes; no se ha aprobado un diseño de interfaz.
- Texto de presentación propuesto: «Tu idea, impresa en 3D. En Mostacho 3D creamos objetos para todos los días y damos forma a tus ideas. Estamos en San Miguel de Tucumán, con retiro coordinado. Consultanos por WhatsApp para evaluar tu proyecto».

## Pendientes y recursos aplazados

- Para continuar las definiciones: precisar tonos, cerrar reglas generales de negocio, páginas y autorización. Categorías iniciales pendientes; productos aplazados expresamente y no bloquean la entrevista.
- Las tareas 1.3 y 1.4 conservan pendientes por la incorporación aplazada de productos y sus recursos. No inventar productos ni dar estas tareas por completas.
- Antes de publicar: completar contacto público y contenido comercial real; incorporar fotos de productos. El logo y el favicon ya están incorporados. La recopilación de fotos de 1.4 permanece pendiente.
- No se han creado imágenes ni configurado servicios externos. El usuario autorizó iniciar la etapa 2 con shadcn/ui manteniendo estos pendientes; se creó la base local React.

## Próximo bloque

La entrevista queda aplazada: el usuario solicitó avanzar a la etapa 2 e incorporar shadcn/ui. Esto no implica dar por completas las tareas pendientes de la etapa 1. Las páginas del plan se usan como estructura inicial revisable.

Confirmar modalidad de atención y páginas previstas. Luego resolver categorías desactivadas, privacidad de fotos de borradores y mecanismo de autorización para los dos administradores, sin solicitar productos ni imágenes. El texto de presentación propuesto sigue pendiente de aprobación.
