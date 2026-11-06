begin;
do $$
declare cat uuid; producto uuid;
begin
 insert into public.categorias(nombre,slug) values ('Prueba precio producto','test-precio-'||gen_random_uuid()) returning id into cat;
 insert into public.productos(categoria_id,nombre,slug,tipo_precio,precio,moneda)
 values(cat,'Producto sin variantes','test-precio-'||gen_random_uuid(),'fijo',12500.50,'ARS') returning id into producto;
 if (select precio from public.productos where id=producto) <> 12500.50 then raise exception 'No se guardó el precio'; end if;
 if exists(select 1 from public.variantes_producto where producto_id=producto) then raise exception 'No debería requerir variantes'; end if;
 update public.productos set precio=0 where id=producto;
 begin
  update public.productos set precio=-1 where id=producto;
  raise exception 'Se aceptó precio negativo';
 exception when check_violation then null;
 end;
 begin
  update public.productos set precio=null where id=producto;
  raise exception 'Se aceptó precio fijo nulo';
 exception when check_violation then null;
 end;
 begin
  update public.productos set moneda='ars' where id=producto;
  raise exception 'Se aceptó moneda inválida';
 exception when check_violation then null;
 end;
 begin
  update public.productos set precio='NaN'::numeric where id=producto;
  raise exception 'Se aceptó NaN';
 exception when check_violation then null;
 end;
 begin
  update public.productos set tipo_precio='a_acordar' where id=producto;
  raise exception 'Se aceptó a acordar con importe';
 exception when check_violation then null;
 end;
 update public.productos set tipo_precio='a_acordar',precio=null,moneda=null where id=producto;
end $$;
rollback;
select 'OK: precio fijo sin variantes, cero válido, acordar y rechazos de precio/moneda inválidos' as resultado;
