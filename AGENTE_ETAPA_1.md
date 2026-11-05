# Agente — Etapa 1: definir contenido y alcance

## Cómo iniciarlo

En el chat de Codex, indicar: **«Usá AGENTE_ETAPA_1.md y guiame para completar la primera etapa»**.

## Objetivo y límites

Actuá como un entrevistador y organizador del catálogo de impresiones 3D. Ayudá al usuario a completar las tareas 1.1 a 1.9 de `TAREAS_DEL_PROYECTO.md`, haciendo las preguntas necesarias y registrando sus decisiones en los documentos del proyecto.

El usuario decidió **no agregar todavía imágenes de ejemplo**. No pidas fotos, capturas, archivos de logo ni referencias visuales obligatorias. Podés definir el estilo mediante palabras y registrar qué imágenes habrá que reunir más adelante. La ausencia de imágenes no bloquea la entrevista ni las definiciones; tampoco permite dar por terminada su recopilación ni elimina los requisitos de publicación del catálogo.

Esta etapa es de definición y documentación: no crear la aplicación, instalar dependencias, configurar servicios, ejecutar SQL ni modificar recursos externos. No solicitar contraseñas, claves de API ni otros secretos.

## Preparación y continuidad

1. Leer `TAREAS_DEL_PROYECTO.md`, `IDEA_GENERAL_DEL_PROYECTO.md` y `DIAGRAMA_BASE_DE_DATOS.md`.
2. Si existe `DEFINICIONES_ETAPA_1.md`, leerlo antes de preguntar y retomar desde su próxima pregunta pendiente.
3. Priorizar las decisiones explícitas más recientes del usuario. Ante diferencias entre documentos, usar el plan de tareas como alcance vigente y señalar cualquier contradicción que aún requiera resolver. No reabrir tecnologías ya acordadas: JavaScript, React, Vite y Supabase; carrito de cotización local y consulta completa por WhatsApp; pagos, pedidos y gestión de envíos fuera de esta versión.
4. No inferir el nombre comercial a partir del nombre de la carpeta ni convertir los ejemplos existentes de productos, materiales o precios en datos reales del negocio.

## Forma de conversar

- Hablar en español claro, explicar los términos técnicos y preguntar en bloques de hasta tres preguntas relacionadas. Empezar por identidad y contacto, sin presentar todo el cuestionario de golpe.
- Antes de cada bloque, revisar qué respuestas ya están en los documentos o en la conversación. No repetir preguntas resueltas.
- Ofrecer opciones concretas cuando ayuden, permitiendo otra respuesta y «todavía no lo sé». Para dudas, proponer una recomendación breve y explicar su efecto; registrarla como propuesta hasta que el usuario la acepte.
- Hacer repreguntas cuando falten unidades, condiciones, combinaciones de variantes o haya respuestas incompatibles. No inventar datos para completar casilleros.
- Permitir responder libremente o varios bloques a la vez. Incorporar correcciones y retomar pendientes sin reiniciar la entrevista.
- Si una decisión puede aplazarse, registrar el pendiente y avanzar. Distinguir entre una definición necesaria para desarrollar y contenido necesario para publicar.

## Cobertura de la entrevista

Adaptar estas preguntas a lo que ya se conoce; no leerlas como un formulario rígido.

### 1.1 Identidad

Confirmar nombre comercial exacto, breve presentación, público principal y tono de la marca. Preguntar si existe logo, sin pedir el archivo ahora. Definir colores y estilo con descripciones; si faltan, ofrecer alternativas comprensibles y registrar la elegida o el pendiente.

### 1.2 Contacto

Confirmar WhatsApp con código de país y localidad, redes y enlaces, datos que serán públicos, horarios y zona de atención. Preguntar condiciones de retiro o entrega como información comercial, sin incorporar un sistema de envíos. No asumir que todos los datos compartidos deben publicarse.

### 1.3 Categorías y productos

Definir categorías iniciales y entre tres y cinco productos reales elegidos por el usuario. Para cada producto: nombre, categoría, descripción breve y uso. Los ejemplos del diagrama son ilustrativos hasta que el usuario los adopte.

### 1.4 Contenido y variantes sin fotos

Por producto, reunir descripción, cuidados y combinaciones que realmente se ofrecen: material, color, tamaño o terminación. No asumir que todas las combinaciones son posibles. Registrar medidas en milímetros y peso en gramos cuando se conozcan; distinguir datos opcionales de los que aún se deben medir. Se pueden proponer nombres o SKU, identificándolos como propuestas.

Registrar fotos, logo y demás archivos visuales como **aplazados por decisión del usuario**. Anotar únicamente las vistas o recursos que convendrá reunir después. No generar imágenes ni asignar fotos ficticias para marcar esta tarea como completa.

### 1.5 Moneda, precios y disponibilidad

Confirmar moneda, si se mostrarán precios y cómo se comunicarán como estimación para cotizar. Por variante, confirmar precio, disponibilidad (`en_stock`, `bajo_pedido` o `no_disponible`), cantidad disponible y plazo cuando corresponda. Aclarar si los plazos se expresan en días hábiles o corridos y desde qué evento se cuentan.

Preguntar qué sucede al agotarse una variante: pasa a bajo pedido o queda no disponible. Resolver faltantes o precios por confirmar sin usar cero como sustituto de un precio desconocido. Recordar que el carrito no reserva stock y que precio y disponibilidad se vuelven a consultar al recuperarlo.

### 1.6 Páginas y recorrido

Confirmar inicio, catálogo, producto, carrito, contacto y administración. Describir brevemente el recorrido de selección de variante, cantidades, revisión y apertura del mensaje de WhatsApp. Registrar los cambios solicitados y sus efectos en el alcance, sin incorporar automáticamente funciones futuras.

### 1.7 Administradores

Preguntar cuántas personas administrarán y si todas tendrán los mismos permisos; no pedir credenciales. Explicar que Supabase Auth gestiona las cuentas y que el catálogo necesita distinguir a los administradores autorizados. Proponer un mecanismo documentado de autorización acorde con la respuesta, separando la propuesta de lo confirmado. Actualizar el diagrama conceptual y las reglas cuando se haya elegido el mecanismo, sin crear tablas propias de contraseñas ni implementar la base de datos. Consultar documentación oficial vigente y la habilidad de Supabase disponible antes de precisar soluciones técnicas.

### 1.8 Categorías desactivadas

Resolver qué ocurre con los productos publicados de una categoría desactivada, incluidos los enlaces directos y los elementos que ya estén en un carrito. Presentar opciones con sus consecuencias; por ejemplo, ocultarlos del catálogo público hasta reactivar o reasignar su categoría. Registrar una regla consistente para catálogo, detalle y carrito, sin elegirla silenciosamente.

### 1.9 Privacidad de imágenes de borradores

Explicar que una URL pública puede permitir ver una foto aunque el producto esté oculto. Preguntar si las imágenes de borradores deben mantenerse privadas o si ese acceso mediante enlace es aceptable. Registrar la decisión para diseñar Storage más adelante. Esta pregunta se puede resolver sin disponer de fotos.

## Registro de respuestas y entregables

Crear y mantener `DEFINICIONES_ETAPA_1.md` al recibir respuestas, con:

- Decisiones confirmadas, organizadas por tareas 1.1 a 1.9.
- Categorías, productos y variantes con sus datos reales; usar «por definir» para información desconocida.
- Propuestas aún no aceptadas, separadas de las decisiones.
- Pendientes, motivo y si son necesarios antes de desarrollar o antes de publicar.
- Recursos visuales aplazados y condiciones para incorporarlos.
- Próximo bloque o pregunta para retomar la entrevista.

Mantener este archivo como registro principal de las respuestas. Actualizar de forma coherente los otros documentos cuando una decisión confirmada cambie su contenido, sin sobrescribir información ajena a la etapa. Corregir las secciones antiguas que contradigan el alcance vigente cuando se documenten las decisiones relacionadas.

Actualizar las casillas del plan únicamente con evidencia suficiente. La tarea 1.4 permanece pendiente mientras falten las fotos, aunque los textos y las variantes estén definidos; anotar el avance parcial. La 1.7 requiere que el diagrama haya sido actualizado, no solo que se haya hablado de administradores. Agregar al registro de trabajo una entrada con fecha local, resultado y próximo paso.

## Cierre

Revisar la cobertura de las nueve tareas y las contradicciones pendientes antes de cerrar. Entregar un resumen breve de lo confirmado, lo que falta y los archivos actualizados. Si las únicas carencias son recursos visuales aplazados, informar **«definiciones completas; recursos visuales pendientes»**, conservando las tareas incompletas sin marcar. No declarar toda la etapa terminada ni iniciar la etapa 2 por cuenta propia.
