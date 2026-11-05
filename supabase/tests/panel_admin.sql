begin;
-- Actores temporales: se revierte todo, incluidas las cuentas de prueba.
select set_config('mostacho.test_admin', gen_random_uuid()::text, true);
select set_config('mostacho.test_user', gen_random_uuid()::text, true);
do $$
declare cat uuid; cat_oculta uuid; mat uuid; col uuid; p uuid; oculto uuid; pcat uuid; v uuid;
begin
 insert into private.correos_administradores(correo) values ('admin-prueba@example.invalid');
 insert into auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data)
 values (current_setting('mostacho.test_admin')::uuid,'admin-prueba@example.invalid',now(),false,'{}'),
 (current_setting('mostacho.test_user')::uuid,'usuario-prueba@example.invalid',now(),false,'{"admin":true,"role":"admin"}');
 insert into public.categorias(nombre,slug) values ('Prueba','prueba-rls-temporal') returning id into cat;
 insert into public.categorias(nombre,slug,activa) values ('Oculta','prueba-rls-oculta',false) returning id into cat_oculta;
 insert into public.materiales(nombre) values ('Material prueba RLS') returning id into mat;
 insert into public.colores(nombre) values ('Color prueba RLS') returning id into col;
 insert into public.productos(categoria_id,nombre,slug) values (cat,'Visible RLS','visible-rls') returning id into p;
 insert into public.productos(categoria_id,nombre,slug) values (cat,'Borrador RLS','borrador-rls') returning id into oculto;
 insert into public.productos(categoria_id,nombre,slug) values (cat_oculta,'Categoria oculta RLS','categoria-oculta-rls') returning id into pcat;
 perform set_config('mostacho.test_product',p::text,true);
 perform set_config('mostacho.test_draft',oculto::text,true);
 perform set_config('mostacho.test_category',cat::text,true);
 -- Metadatos sintéticos exclusivamente para probar RLS, sin subir archivos.
 -- Toda esta transacción termina en ROLLBACK.
 insert into storage.objects(bucket_id,name)
 select 'productos','products/' || id || '/' || gen_random_uuid() || '.webp'
 from public.productos where id in (p,oculto,pcat);
 insert into public.imagenes_producto(producto_id,storage_path,texto_alternativo)
 select split_part(name,'/',2)::uuid,name,'Metadato temporal, sin archivo real'
 from storage.objects where bucket_id='productos' and split_part(name,'/',2) in (p::text,oculto::text,pcat::text);
 insert into public.variantes_producto(producto_id,material_id,color_id,sku,nombre,precio,moneda,disponibilidad,stock)
 values (p,mat,col,'TEST-RLS-VISIBLE','Visible',100,'ARS','bajo_pedido',2),
 (oculto,mat,col,'TEST-RLS-BORRADOR','Borrador',100,'ARS','bajo_pedido',2),
 (pcat,mat,col,'TEST-RLS-CAT-OCULTA','Categoria oculta',100,'ARS','bajo_pedido',2);
 insert into public.variantes_producto(producto_id,material_id,color_id,sku,nombre,precio,moneda,disponibilidad,stock,activa)
 values (p,mat,col,'TEST-RLS-INACTIVA','Inactiva',100,'ARS','bajo_pedido',2,false);
 update public.productos set publicado=true where id in (p,pcat);
end $$;
set constraints all immediate;
set constraints all deferred;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$
begin
 if (select count(*) from public.productos where slug in ('visible-rls','borrador-rls','categoria-oculta-rls')) <> 1 then raise exception 'FALLO: lectura de productos anon'; end if;
 if (select count(*) from public.imagenes_producto where producto_id in (select id from public.productos where slug in ('visible-rls','borrador-rls','categoria-oculta-rls'))) <> 1 then raise exception 'FALLO: lectura de imagenes anon'; end if;
 if (select count(*) from public.variantes_producto where sku like 'TEST-RLS-%') <> 1 then raise exception 'FALLO: lectura de variantes anon'; end if;
 if exists (select 1 from public.productos where es_ejemplo) then raise exception 'FALLO: ejemplo expuesto'; end if;
 begin
  insert into public.categorias(nombre,slug) values ('Ataque','ataque');
  raise exception 'FALLO: anon pudo escribir';
 exception when insufficient_privilege then null;
 end;
 if private.es_administrador() then raise exception 'FALLO: anon administrador'; end if;
 begin
  perform public.mi_acceso_admin();
  raise exception 'FALLO: RPC de administrador expuesto a anon';
 exception when insufficient_privilege then null; end;

end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('mostacho.test_user'),'role','authenticated','user_metadata',json_build_object('admin',true))::text,true);
do $$
declare n integer;
begin
 if private.es_administrador() then raise exception 'FALLO: metadata permite escalar'; end if;
 if public.mi_acceso_admin() then raise exception 'FALLO: RPC autoriza metadata falsa'; end if;
 begin
  perform public.reordenar_imagenes(current_setting('mostacho.test_product')::uuid, array[]::uuid[]);
  raise exception 'FALLO: usuario sin rol pudo ordenar';
 exception when insufficient_privilege then null; end;

 if exists (select 1 from public.productos where id = current_setting('mostacho.test_draft')::uuid) then raise exception 'FALLO: usuario ve borrador'; end if;
 begin
  insert into public.categorias(nombre,slug) values ('Ataque autenticado','ataque-autenticado');
  raise exception 'FALLO: usuario pudo insertar';
 exception when insufficient_privilege then null;
 end;
 update public.productos set nombre='Ataque' where id=current_setting('mostacho.test_product')::uuid;
 get diagnostics n = row_count;
 if n <> 0 then raise exception 'FALLO: usuario pudo editar'; end if;
 delete from public.productos where id=current_setting('mostacho.test_product')::uuid;
 get diagnostics n = row_count;
 if n <> 0 then raise exception 'FALLO: usuario pudo eliminar'; end if;
 begin
  insert into private.administradores(usuario_id) values (current_setting('mostacho.test_user')::uuid);
  raise exception 'FALLO: usuario pudo autoasignarse rol';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('mostacho.test_admin'),'role','authenticated')::text,true);
do $$
declare nuevo uuid; n integer;
begin
 if not private.es_administrador() then raise exception 'FALLO: admin sin acceso'; end if;
 if not exists (select 1 from public.productos where id=current_setting('mostacho.test_draft')::uuid) then raise exception 'FALLO: admin no ve borrador'; end if;
 insert into public.categorias(nombre,slug) values ('Nueva','admin-nueva') returning id into nuevo;
 update public.categorias set nombre='Editada' where id=nuevo;
 get diagnostics n = row_count;
 if n <> 1 then raise exception 'FALLO: admin no edita'; end if;
 delete from public.categorias where id=nuevo;
 get diagnostics n = row_count;
 if n <> 1 then raise exception 'FALLO: admin no elimina'; end if;
 -- No se puede publicar un borrador incompleto.
 begin
  insert into public.productos(categoria_id,nombre,slug,publicado)
  values (current_setting('mostacho.test_category')::uuid,'Incompleto','incompleto-rls',true);
  set constraints all immediate;
  raise exception 'FALLO: publicación sin imagen ni variante';
 exception when check_violation then null;
 end;
 -- Borrar o mover la última foto también respeta la regla.
 begin
  delete from public.imagenes_producto where producto_id=current_setting('mostacho.test_product')::uuid;
  set constraints all immediate;
  raise exception 'FALLO: eliminar ultima foto';
 exception when check_violation then null;
 end;
 begin
  update public.imagenes_producto set producto_id=current_setting('mostacho.test_draft')::uuid, orden=5
  where producto_id=current_setting('mostacho.test_product')::uuid;
  set constraints all immediate;
  raise exception 'FALLO: mover ultima foto';
 exception when check_violation then null;
 end;
 begin
  update public.variantes_producto set activa=false where producto_id=current_setting('mostacho.test_product')::uuid;
  set constraints all immediate;
  raise exception 'FALLO: desactivar ultima variante';
 exception when check_violation then null;
 end;
 begin
  delete from public.variantes_producto where producto_id=current_setting('mostacho.test_product')::uuid;
  set constraints all immediate;
  raise exception 'FALLO: borrar ultima variante';
 exception when check_violation then null;
 end;
 begin
  update public.variantes_producto set precio=-1 where sku='TEST-RLS-VISIBLE';
  raise exception 'FALLO: precio negativo';
 exception when check_violation then null;
 end;
 begin
  update public.variantes_producto set tipo_precio='a_acordar',precio=100,moneda='ARS' where sku='TEST-RLS-VISIBLE';
  raise exception 'FALLO: precio a acordar con importe';
 exception when check_violation then null;
 end;
 begin
  update public.variantes_producto set plazo_produccion_dias=-1 where sku='TEST-RLS-VISIBLE';
  raise exception 'FALLO: plazo negativo';
 exception when check_violation then null;
 end;
 begin
  delete from public.categorias where id=current_setting('mostacho.test_category')::uuid;
  raise exception 'FALLO: eliminar categoria referenciada';
 exception when foreign_key_violation then null;
 end;

 if not public.mi_acceso_admin() then raise exception 'FALLO: RPC no reconoce admin'; end if;
 declare foto uuid; anterior uuid; ruta text;
 begin
  select id into anterior from public.imagenes_producto where producto_id=current_setting('mostacho.test_product')::uuid limit 1;
  ruta := 'products/' || current_setting('mostacho.test_product') || '/' || gen_random_uuid() || '.webp';
  insert into storage.objects(bucket_id,name) values('productos',ruta);
  insert into public.imagenes_producto(producto_id,storage_path,texto_alternativo,orden)
  values(current_setting('mostacho.test_product')::uuid,ruta,'Segunda imagen temporal',5) returning id into foto;
  perform public.reordenar_imagenes(current_setting('mostacho.test_product')::uuid,array[foto,anterior]);
  if not exists(select 1 from public.imagenes_producto where id=foto and orden=0)
  or not exists(select 1 from public.imagenes_producto where id=anterior and orden=1)
  then raise exception 'FALLO: orden de galeria'; end if;
  begin
   perform public.reordenar_imagenes(current_setting('mostacho.test_product')::uuid,array[foto,foto]);
   raise exception 'FALLO: orden duplicado permitido';
  exception when invalid_parameter_value then null; end;
 end;
 update public.productos set nombre='Nombre editado por admin' where id=current_setting('mostacho.test_product')::uuid;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
 if not exists(select 1 from public.productos where id=current_setting('mostacho.test_product')::uuid and nombre='Nombre editado por admin')
 then raise exception 'FALLO: cambio del panel no visible al publico'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('mostacho.test_admin'),'role','authenticated')::text,true);
do $$ begin
 update public.categorias set activa=false where id=current_setting('mostacho.test_category')::uuid;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$
begin
 if exists(select 1 from public.productos where id=current_setting('mostacho.test_product')::uuid)
 or exists(select 1 from public.imagenes_producto where producto_id=current_setting('mostacho.test_product')::uuid)
 or exists(select 1 from public.variantes_producto where producto_id=current_setting('mostacho.test_product')::uuid)
 then raise exception 'FALLO: categoria inactiva filtra contenido'; end if;
end $$;
reset role;
-- Revocación efectiva aunque el JWT del administrador siga vigente.
update private.administradores set activo=false where usuario_id=current_setting('mostacho.test_admin')::uuid;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('mostacho.test_admin'),'role','authenticated')::text,true);
do $$ begin if private.es_administrador() then raise exception 'FALLO: revocacion no efectiva'; end if; end $$;
reset role;
select 'OK: RPC de acceso, galeria atomica, permiso denegado sin rol, cambios administrativos visibles al publico y regresiones de catalogo' as resultado;
rollback;
