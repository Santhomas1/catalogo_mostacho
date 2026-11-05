-- Mostacho 3D: esquema inicial y autorización. Proyecto de desarrollo aislado.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table private.administradores (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
alter table private.administradores enable row level security;
revoke all on private.administradores from public, anon, authenticated;

create table private.correos_administradores (
  correo text primary key check (correo = lower(btrim(correo)) and position('@' in correo) > 1),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
alter table private.correos_administradores enable row level security;
revoke all on private.correos_administradores from public, anon, authenticated;

create function private.es_administrador()
returns boolean language sql stable security definer set search_path = ''
as $$
 select auth.uid() is not null and exists (
   select 1 from private.administradores a join auth.users u on u.id = a.usuario_id
   join private.correos_administradores c on c.correo = lower(u.email)
   where a.usuario_id = (select auth.uid()) and a.activo and c.activo
   and u.email_confirmed_at is not null and not u.is_anonymous
 );
$$;
revoke all on function private.es_administrador() from public;
grant execute on function private.es_administrador() to anon, authenticated;

-- No acepta roles de user_metadata. Solo correos confirmados y previamente autorizados.
create function private.sincronizar_administrador()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if new.email_confirmed_at is not null and not coalesce(new.is_anonymous, false)
 and exists (select 1 from private.correos_administradores where correo = lower(new.email) and activo)
 then
   insert into private.administradores(usuario_id) values (new.id)
   on conflict (usuario_id) do nothing;
 end if;
 return new;
end;
$$;
revoke all on function private.sincronizar_administrador() from public, anon, authenticated;
create trigger sincronizar_administrador after insert or update of email, email_confirmed_at on auth.users
for each row execute function private.sincronizar_administrador();

create table public.categorias (
 id uuid primary key default gen_random_uuid(),
 nombre text not null check (length(btrim(nombre)) between 1 and 120),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 descripcion text, orden integer not null default 0 check (orden >= 0),
 activa boolean not null default true,
 creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now()
);
create table public.materiales (
 id uuid primary key default gen_random_uuid(),
 nombre text not null unique check (length(btrim(nombre)) between 1 and 120),
 descripcion text, activo boolean not null default true,
 creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now()
);
create table public.colores (
 id uuid primary key default gen_random_uuid(),
 nombre text not null unique check (length(btrim(nombre)) between 1 and 120),
 codigo_hex text check (codigo_hex ~ '^#[0-9A-Fa-f]{6}$'), activo boolean not null default true,
 creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now()
);
create table public.productos (
 id uuid primary key default gen_random_uuid(),
 categoria_id uuid not null references public.categorias(id) on delete restrict,
 nombre text not null check (length(btrim(nombre)) between 1 and 180),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 descripcion text, instrucciones_cuidado text,
 destacado boolean not null default false, publicado boolean not null default false,
 es_ejemplo boolean not null default false,
 creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now()
);
create index productos_categoria_id_idx on public.productos(categoria_id);
create index productos_publicados_idx on public.productos(creado_en desc, id) where publicado;
create table public.imagenes_producto (
 id uuid primary key default gen_random_uuid(),
 producto_id uuid not null references public.productos(id) on delete cascade,
 url text not null check (length(btrim(url)) > 0),
 texto_alternativo text not null check (length(btrim(texto_alternativo)) > 0),
 orden integer not null default 0 check (orden >= 0),
 creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(),
 unique(producto_id, orden)
);
create table public.variantes_producto (
 id uuid primary key default gen_random_uuid(),
 producto_id uuid not null references public.productos(id) on delete cascade,
 material_id uuid not null references public.materiales(id) on delete restrict,
 color_id uuid not null references public.colores(id) on delete restrict,
 sku text not null unique check (length(btrim(sku)) between 1 and 120),
 nombre text not null check (length(btrim(nombre)) between 1 and 180),
 ancho_mm numeric(12,2) check (ancho_mm > 0 and ancho_mm <> 'NaN'::numeric),
 alto_mm numeric(12,2) check (alto_mm > 0 and alto_mm <> 'NaN'::numeric),
 profundidad_mm numeric(12,2) check (profundidad_mm > 0 and profundidad_mm <> 'NaN'::numeric),
 peso_g numeric(12,2) check (peso_g > 0 and peso_g <> 'NaN'::numeric),
 precio numeric(12,2) not null check (precio >= 0 and precio <> 'NaN'::numeric),
 moneda text not null check (moneda ~ '^[A-Z]{3}$'),
 disponibilidad text not null check (disponibilidad in ('en_stock','bajo_pedido','no_disponible')),
 stock integer check (stock >= 0),
 plazo_produccion_dias integer check (plazo_produccion_dias >= 0),
 activa boolean not null default true,
 creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(),
 check (disponibilidad <> 'en_stock' or (stock is not null and stock > 0)),
 check (disponibilidad <> 'bajo_pedido' or plazo_produccion_dias is not null)
);
create index variantes_producto_producto_id_idx on public.variantes_producto(producto_id);
create index variantes_producto_material_id_idx on public.variantes_producto(material_id);
create index variantes_producto_color_id_idx on public.variantes_producto(color_id);

create function private.actualizar_fecha()
returns trigger language plpgsql set search_path = ''
as $$ begin new.actualizado_en := clock_timestamp(); return new; end; $$;
revoke all on function private.actualizar_fecha() from public, anon, authenticated;

-- Serializa cambios de hijos mediante una escritura del padre; evita perder la última
-- foto/variante en transacciones simultáneas. En aislamiento repeatable read provoca
-- conflicto de serialización en lugar de dejar un producto inválido.
create function private.tocar_producto()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare anterior uuid; siguiente uuid;
begin
 if tg_op <> 'INSERT' then anterior := old.producto_id; end if;
 if tg_op <> 'DELETE' then siguiente := new.producto_id; end if;
 perform 1 from public.productos where id in (anterior, siguiente) order by id for update;
 update public.productos set actualizado_en = clock_timestamp() where id in (anterior, siguiente);
 if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function private.tocar_producto() from public, anon, authenticated;

create function private.validar_publicacion()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare producto uuid;
begin
 -- Los disparadores sobre hijos escriben el padre y encolan esta validación.
 producto := new.id;
 if exists (select 1 from public.productos where id = producto and publicado) then
   if not exists (select 1 from public.imagenes_producto where producto_id = producto) then
     raise exception using errcode = '23514', message = 'Un producto publicado necesita al menos una imagen.';
   end if;
   if not exists (select 1 from public.variantes_producto where producto_id = producto and activa) then
     raise exception using errcode = '23514', message = 'Un producto publicado necesita al menos una variante activa.';
   end if;
 end if;
 return null;
end;
$$;
revoke all on function private.validar_publicacion() from public, anon, authenticated;
create constraint trigger producto_publicable after insert or update on public.productos
deferrable initially deferred for each row execute function private.validar_publicacion();

do $$
declare tabla text;
begin
 foreach tabla in array array['categorias','materiales','colores','productos','imagenes_producto','variantes_producto'] loop
  execute format('alter table public.%I enable row level security', tabla);
  execute format('revoke all on public.%I from public, anon, authenticated', tabla);
  execute format('grant select on public.%I to anon, authenticated', tabla);
  execute format('grant insert, update, delete on public.%I to authenticated', tabla);
  execute format('grant all on public.%I to service_role', tabla);
  execute format('create trigger actualizar_fecha before update on public.%I for each row execute function private.actualizar_fecha()', tabla);
  execute format('create policy admin_insert on public.%I for insert to authenticated with check ((select private.es_administrador()))', tabla);
  execute format('create policy admin_update on public.%I for update to authenticated using ((select private.es_administrador())) with check ((select private.es_administrador()))', tabla);
  execute format('create policy admin_delete on public.%I for delete to authenticated using ((select private.es_administrador()))', tabla);
 end loop;
 foreach tabla in array array['imagenes_producto','variantes_producto'] loop
  execute format('create trigger tocar_producto before insert or update or delete on public.%I for each row execute function private.tocar_producto()', tabla);
 end loop;
end; $$;

create policy lectura on public.categorias for select to anon, authenticated
using ((select private.es_administrador()) or activa);
create policy lectura on public.materiales for select to anon, authenticated
using ((select private.es_administrador()) or activo);
create policy lectura on public.colores for select to anon, authenticated
using ((select private.es_administrador()) or activo);
create policy lectura on public.productos for select to anon, authenticated
using ((select private.es_administrador()) or (
 publicado and not es_ejemplo and exists (select 1 from public.categorias c where c.id = categoria_id and c.activa)
));
create policy lectura on public.imagenes_producto for select to anon, authenticated
using ((select private.es_administrador()) or exists (
 select 1 from public.productos p where p.id = producto_id and p.publicado and not p.es_ejemplo
));
create policy lectura on public.variantes_producto for select to anon, authenticated
using ((select private.es_administrador()) or (
 activa and exists (select 1 from public.productos p where p.id = producto_id and p.publicado and not p.es_ejemplo)
 and exists (select 1 from public.materiales m where m.id = material_id and m.activo)
 and exists (select 1 from public.colores c where c.id = color_id and c.activo)
));
comment on table private.administradores is 'Autorización del catálogo. Solo operaciones privilegiadas pueden otorgarla; no se gestionan contraseñas.';
comment on column public.productos.es_ejemplo is 'Los datos ficticios nunca son legibles por visitantes, aunque se publiquen accidentalmente.';
