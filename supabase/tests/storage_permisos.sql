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
end $$;

do $$
declare n integer; permiso boolean; regla text;
begin
 if (select count(*) from storage.objects where bucket_id='productos') <> 1 then raise exception 'FALLO: archivos de borradores visibles'; end if;
 select qual into regla from pg_policies where schemaname='storage' and tablename='objects' and policyname='productos_delete';
 execute 'select coalesce(bool_or((' || regla || ')),false) from storage.objects where bucket_id=''productos''' into permiso;
 if permiso then raise exception 'FALLO: visitante puede borrar objetos visibles'; end if;

 begin
  insert into storage.objects(bucket_id,name) values ('productos','products/' || current_setting('mostacho.test_product') || '/' || gen_random_uuid() || '.webp');
  raise exception 'FALLO: visitante pudo cargar';
 exception when insufficient_privilege then null;
 end;
 update storage.objects set metadata='{}'::jsonb where bucket_id='productos';
 get diagnostics n=row_count;
 if n<>0 then raise exception 'FALLO: visitante pudo reemplazar'; end if;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('mostacho.test_user'),'role','authenticated','user_metadata',json_build_object('admin',true))::text,true);
do $$
declare n integer;
begin
 if private.es_administrador() then raise exception 'FALLO: metadata permite escalar'; end if;
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
 -- Una categoría desactivada oculta su producto y sus hijos.
 update public.categorias set activa=false where id=current_setting('mostacho.test_category')::uuid;
end $$;

do $$
declare ruta text; n integer;
begin
 if (select count(*) from storage.objects where bucket_id='productos') <> 3 then raise exception 'FALLO: admin no ve borradores'; end if;
 ruta := 'products/' || current_setting('mostacho.test_product') || '/' || gen_random_uuid() || '.webp';
 insert into storage.objects(bucket_id,name) values('productos',ruta);
 update storage.objects set metadata='{"prueba":true}' where bucket_id='productos' and name=ruta;
 get diagnostics n=row_count;
 if n<>1 then raise exception 'FALLO: admin no reemplaza archivo libre'; end if;
 update storage.objects set metadata='{"prueba":true}' where bucket_id='productos' and name<>ruta;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'FALLO: reemplazo de archivo referenciado permitido'; end if;
 begin
  insert into public.imagenes_producto(producto_id,storage_path,texto_alternativo,orden)
  values(current_setting('mostacho.test_product')::uuid,'products/' || current_setting('mostacho.test_product') || '/' || gen_random_uuid() || '.webp','Prueba sin objeto',10);
  raise exception 'FALLO: referencia sin archivo';
 exception when check_violation then null;
 end;
 insert into public.imagenes_producto(producto_id,storage_path,texto_alternativo,orden)
 values(current_setting('mostacho.test_product')::uuid,ruta,'Referencia temporal de prueba',9);
 delete from public.imagenes_producto where storage_path=ruta;
 if not exists(select 1 from public.archivos_pendientes_limpieza where storage_path=ruta) then raise exception 'FALLO: no se encolo la limpieza'; end if;
 begin
  insert into public.imagenes_producto(producto_id,storage_path,texto_alternativo,orden)
  values(current_setting('mostacho.test_product')::uuid,ruta,'No reutilizar',9);
  raise exception 'FALLO: reutilizar ruta en limpieza';
 exception when check_violation then null;
 end;
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
select 'OK: Storage: visitantes sin carga/reemplazo, borradores privados, acceso admin, reemplazo protegido, referencia existente y cola de limpieza; regresiones de catalogo correctas' as resultado;
rollback;
