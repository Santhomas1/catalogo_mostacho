-- Las variantes y los cuidados son opcionales; se conserva la foto obligatoria.
create or replace function private.validar_publicacion()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if exists (select 1 from public.productos where id = new.id and publicado)
    and not exists (select 1 from public.imagenes_producto where producto_id = new.id) then
   raise exception using errcode = '23514', message = 'Un producto publicado necesita al menos una imagen.';
 end if;
 return null;
end;
$$;
revoke all on function private.validar_publicacion() from public, anon, authenticated;
