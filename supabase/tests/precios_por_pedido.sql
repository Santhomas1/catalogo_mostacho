begin;
do $$
declare variante uuid;
begin
 select v.id into variante from public.variantes_producto v join public.productos p on p.id=v.producto_id where p.es_ejemplo limit 1;
 if variante is null then raise exception 'Falta fixture de ejemplo'; end if;
 update public.variantes_producto set tipo_precio='a_acordar',precio=null,moneda=null,disponibilidad='bajo_pedido',plazo_produccion_dias=null where id=variante;
 begin
  update public.variantes_producto set precio=0 where id=variante;
  raise exception 'FALLO: a acordar aceptó un precio';
 exception when check_violation then null; end;
 begin
  update public.variantes_producto set tipo_precio='fijo' where id=variante;
  raise exception 'FALLO: fijo sin importe y moneda';
 exception when check_violation then null; end;
 update public.variantes_producto set tipo_precio='fijo',precio=5000,moneda='ARS' where id=variante;
 begin
  update public.variantes_producto set disponibilidad='en_stock' where id=variante;
  raise exception 'FALLO: disponibilidad con stock';
 exception when check_violation then null; end;
 begin
  update public.variantes_producto set precio=-1 where id=variante;
  raise exception 'FALLO: precio negativo';
 exception when check_violation then null; end;
end $$;
select 'OK: pedido sin plazo obligatorio, fijo con precio/moneda, a acordar sin importe, no en_stock y no precio negativo' as resultado;
rollback;
