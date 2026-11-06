alter table public.productos
 add column tipo_precio text not null default 'a_acordar'
   check (tipo_precio in ('fijo','a_acordar')),
 add column precio numeric(12,2),
 add column moneda text,
 add constraint precio_producto_segun_modalidad check (
   (tipo_precio = 'a_acordar' and precio is null and moneda is null)
   or (tipo_precio = 'fijo' and precio is not null and precio >= 0
       and precio <> 'NaN'::numeric and moneda is not null and moneda ~ '^[A-Z]{3}$')
 );
comment on column public.productos.precio is 'Precio del producto sin variantes; las variantes conservan su propio precio.';
