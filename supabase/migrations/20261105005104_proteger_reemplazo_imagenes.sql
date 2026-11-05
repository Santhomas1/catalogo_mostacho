-- Reemplazar significa cargar una nueva ruta y cambiar la referencia.
-- No se permite mover ni sobrescribir un objeto referenciado.
alter policy productos_update on storage.objects
using (bucket_id='productos' and (select private.es_administrador()) and not exists (
 select 1 from public.imagenes_producto i where i.bucket_id='productos' and i.storage_path=storage.objects.name
))
with check (bucket_id='productos' and (select private.es_administrador()) and private.ruta_producto_valida(name) and not exists (
 select 1 from public.imagenes_producto i where i.bucket_id='productos' and i.storage_path=storage.objects.name
));
