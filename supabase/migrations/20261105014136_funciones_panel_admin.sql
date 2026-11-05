-- Superficie mínima: consulta de autorización sin datos personales ni asignación de roles.
create function public.mi_acceso_admin()
returns boolean language sql stable security invoker set search_path=''
as $$ select private.es_administrador(); $$;
revoke all on function public.mi_acceso_admin() from public,anon;
grant execute on function public.mi_acceso_admin() to authenticated;

-- Ordenar una galería de forma atómica sin violar el orden único por producto.
create function public.reordenar_imagenes(p_producto_id uuid,p_imagenes uuid[])
returns void language plpgsql security invoker set search_path=''
as $$
declare total integer; distintos integer;
begin
 if not private.es_administrador() then raise exception using errcode='42501',message='Solo administradores pueden ordenar imágenes.'; end if;
 perform 1 from public.productos where id=p_producto_id for update;
 if not found then raise exception using errcode='22023',message='Producto no disponible.'; end if;
 select count(*) into total from public.imagenes_producto where producto_id=p_producto_id;
 select count(distinct id) into distintos from unnest(p_imagenes) as ids(id);
 if p_imagenes is null or cardinality(p_imagenes)<>total or distintos<>total
 or exists(select 1 from unnest(p_imagenes) as ids(id) where id is null or not exists(select 1 from public.imagenes_producto i where i.id=ids.id and i.producto_id=p_producto_id))
 then raise exception using errcode='22023',message='La galería cambió. Recargá antes de ordenar.'; end if;
 -- Elegir N posiciones libres fuera de las posiciones finales 0..N-1.
 with libres as (
  select valor,row_number() over(order by valor) as posicion
  from generate_series(total,total*3) as serie(valor)
  where not exists(select 1 from public.imagenes_producto i where i.producto_id=p_producto_id and i.orden=valor)
  order by valor limit total
 ), destino as (
  select ids.id, libres.valor from unnest(p_imagenes) with ordinality as ids(id,posicion) join libres using(posicion)
 )
 update public.imagenes_producto i set orden=destino.valor from destino where i.id=destino.id and i.producto_id=p_producto_id;
 update public.imagenes_producto i set orden=(ids.posicion-1)::integer
 from unnest(p_imagenes) with ordinality as ids(id,posicion)
 where i.id=ids.id and i.producto_id=p_producto_id;
end; $$;
revoke all on function public.reordenar_imagenes(uuid,uuid[]) from public,anon;
grant execute on function public.reordenar_imagenes(uuid,uuid[]) to authenticated;
