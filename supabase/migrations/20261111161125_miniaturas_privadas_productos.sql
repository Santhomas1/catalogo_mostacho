-- Additive; apply to staging and verify Storage authorization before enabling
-- VITE_PRODUCT_THUMBNAILS=true. Existing images keep their original path.
-- No object is rewritten, deleted, or made public by this migration.
begin;
alter table public.imagenes_producto add column thumbnail_path text;
alter table public.imagenes_producto add constraint miniatura_ruta_valida check (
 thumbnail_path is null or (
  thumbnail_path ~ '^products/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'
  and split_part(thumbnail_path,'/',2)=producto_id::text
  and thumbnail_path <> storage_path
 )
);

create or replace function private.imagen_lectura(ruta text)
returns boolean language sql stable security invoker set search_path=''
as $$
 select exists (select 1 from public.imagenes_producto i
 where i.bucket_id='productos' and (i.storage_path=ruta or i.thumbnail_path=ruta));
$$;
-- Preserve the original invoker/RLS boundary and grants.
revoke all on function private.imagen_lectura(text) from public;
grant execute on function private.imagen_lectura(text) to anon,authenticated;

create or replace function private.validar_archivo_imagen()
returns trigger language plpgsql security definer set search_path=''
as $$
declare ruta text;
begin
 foreach ruta in array array[new.storage_path,new.thumbnail_path] loop
  if ruta is null then continue; end if;
  perform 1 from storage.objects where bucket_id=new.bucket_id and name=ruta for key share;
  if not found then raise exception using errcode='23514',message='Cargar primero la imagen y su miniatura en Storage.'; end if;
  if exists(select 1 from public.archivos_pendientes_limpieza where bucket_id=new.bucket_id and storage_path=ruta) then
   raise exception using errcode='23514',message='La ruta esta pendiente de limpieza. Usar una ruta nueva.';
  end if;
 end loop;
 return new;
end; $$;
revoke all on function private.validar_archivo_imagen() from public,anon,authenticated;
drop trigger validar_archivo on public.imagenes_producto;
create trigger validar_archivo before insert or update of bucket_id,storage_path,thumbnail_path on public.imagenes_producto
for each row execute function private.validar_archivo_imagen();

create or replace function private.encolar_imagen_eliminada()
returns trigger language plpgsql security definer set search_path=''
as $$
declare ruta text;
begin
 foreach ruta in array array[old.storage_path,old.thumbnail_path] loop
  if ruta is not null and (tg_op='DELETE' or (ruta is distinct from new.storage_path and ruta is distinct from new.thumbnail_path)) then
   insert into public.archivos_pendientes_limpieza(bucket_id,storage_path)
   values(old.bucket_id,ruta) on conflict(storage_path) do nothing;
  end if;
 end loop;
 return null;
end; $$;
revoke all on function private.encolar_imagen_eliminada() from public,anon,authenticated;
drop trigger encolar_limpieza on public.imagenes_producto;
create trigger encolar_limpieza after delete or update of storage_path,bucket_id,thumbnail_path on public.imagenes_producto
for each row execute function private.encolar_imagen_eliminada();

-- Both files are immutable while referenced; only authorized admins can write.
alter policy productos_update on storage.objects
using (bucket_id='productos' and (select private.es_administrador()) and not exists (
 select 1 from public.imagenes_producto i where i.bucket_id='productos' and (i.storage_path=storage.objects.name or i.thumbnail_path=storage.objects.name)
))
with check (bucket_id='productos' and (select private.es_administrador()) and private.ruta_producto_valida(name) and not exists (
 select 1 from public.imagenes_producto i where i.bucket_id='productos' and (i.storage_path=storage.objects.name or i.thumbnail_path=storage.objects.name)
));
alter policy productos_delete on storage.objects
using (bucket_id='productos' and (select private.es_administrador()) and not exists (
 select 1 from public.imagenes_producto i where i.bucket_id='productos' and (i.storage_path=storage.objects.name or i.thumbnail_path=storage.objects.name)
));
commit;
