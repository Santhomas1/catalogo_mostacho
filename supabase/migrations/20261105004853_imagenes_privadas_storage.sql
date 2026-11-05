-- Bucket: solo configuración. Los archivos se cargan/eliminan por la API de Storage.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('productos','productos',false,5242880,array['image/jpeg','image/png','image/webp']);

-- No existen imágenes cargadas; se guarda la ruta estable, nunca una URL firmada.
alter table public.imagenes_producto rename column url to storage_path;
alter table public.imagenes_producto add column bucket_id text not null default 'productos' check (bucket_id='productos');
alter table public.imagenes_producto add constraint imagen_ruta_valida check (
 storage_path ~ '^products/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$'
 and split_part(storage_path,'/',2)=producto_id::text
);
alter table public.imagenes_producto add constraint imagen_ruta_unica unique(bucket_id,storage_path);

create table public.archivos_pendientes_limpieza (
 id uuid primary key default gen_random_uuid(),
 bucket_id text not null default 'productos' check (bucket_id='productos'),
 storage_path text not null unique check (storage_path ~ '^products/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png)$'),
 motivo text not null default 'referencia_eliminada',
 creado_en timestamptz not null default now()
);
alter table public.archivos_pendientes_limpieza enable row level security;
revoke all on public.archivos_pendientes_limpieza from public, anon, authenticated;
grant select,insert,delete on public.archivos_pendientes_limpieza to authenticated;
grant all on public.archivos_pendientes_limpieza to service_role;
create policy admin_lectura on public.archivos_pendientes_limpieza for select to authenticated using ((select private.es_administrador()));
create policy admin_insert on public.archivos_pendientes_limpieza for insert to authenticated with check ((select private.es_administrador()));
create policy admin_delete on public.archivos_pendientes_limpieza for delete to authenticated using ((select private.es_administrador()));

create function private.imagen_lectura(ruta text)
returns boolean language sql stable security invoker set search_path=''
as $$
 select exists (select 1 from public.imagenes_producto i where i.bucket_id='productos' and i.storage_path=ruta);
$$;
revoke all on function private.imagen_lectura(text) from public;
grant execute on function private.imagen_lectura(text) to anon, authenticated;

create function private.ruta_producto_valida(ruta text)
returns boolean language plpgsql stable security invoker set search_path=''
as $$
begin
 if ruta !~ '^products/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$' then return false; end if;
 return exists(select 1 from public.productos where id=split_part(ruta,'/',2)::uuid);
end;
$$;
revoke all on function private.ruta_producto_valida(text) from public;
grant execute on function private.ruta_producto_valida(text) to authenticated;

-- Evita guardar referencias a archivos inexistentes y bloquea su borrado concurrente.
create function private.validar_archivo_imagen()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 perform 1 from storage.objects where bucket_id=new.bucket_id and name=new.storage_path for key share;
 if not found then raise exception using errcode='23514', message='La imagen debe cargarse en Storage antes de guardar su referencia.'; end if;
 if exists(select 1 from public.archivos_pendientes_limpieza where bucket_id=new.bucket_id and storage_path=new.storage_path) then
  raise exception using errcode='23514', message='Esta ruta está pendiente de limpieza. Cargá la imagen con un nombre nuevo.';
 end if;
 return new;
end; $$;
revoke all on function private.validar_archivo_imagen() from public,anon,authenticated;
create trigger validar_archivo before insert or update of bucket_id,storage_path on public.imagenes_producto
for each row execute function private.validar_archivo_imagen();

create function private.encolar_imagen_eliminada()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='DELETE' or old.storage_path is distinct from new.storage_path or old.bucket_id is distinct from new.bucket_id then
  insert into public.archivos_pendientes_limpieza(bucket_id,storage_path)
  values(old.bucket_id,old.storage_path) on conflict(storage_path) do nothing;
 end if;
 return null;
end; $$;
revoke all on function private.encolar_imagen_eliminada() from public,anon,authenticated;
create trigger encolar_limpieza after delete or update of storage_path,bucket_id on public.imagenes_producto
for each row execute function private.encolar_imagen_eliminada();

-- Las políticas leen la tabla de imágenes bajo su RLS: oculta borradores, ejemplos
-- y categorías desactivadas incluso al consultar el archivo por ruta directa.
create policy productos_lectura on storage.objects for select to anon,authenticated
using (bucket_id='productos' and ((select private.es_administrador()) or private.imagen_lectura(name)));
create policy productos_insert on storage.objects for insert to authenticated
with check (bucket_id='productos' and (select private.es_administrador()) and private.ruta_producto_valida(name));
create policy productos_update on storage.objects for update to authenticated
using (bucket_id='productos' and (select private.es_administrador()))
with check (bucket_id='productos' and (select private.es_administrador()) and private.ruta_producto_valida(name));
-- No permite borrar un archivo aún utilizado por una ficha.
create policy productos_delete on storage.objects for delete to authenticated
using (bucket_id='productos' and (select private.es_administrador()) and not exists (
 select 1 from public.imagenes_producto i where i.bucket_id='productos' and i.storage_path=storage.objects.name
));
