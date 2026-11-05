alter table public.variantes_producto drop constraint variantes_producto_check;
alter table public.variantes_producto drop constraint variantes_producto_check1;
alter table public.variantes_producto drop constraint variantes_producto_disponibilidad_check;
alter table public.variantes_producto add column tipo_precio text not null default 'fijo'
 check(tipo_precio in ('fijo','a_acordar'));
alter table public.variantes_producto alter column precio drop not null;
alter table public.variantes_producto alter column moneda drop not null;
update public.variantes_producto set disponibilidad='bajo_pedido' where disponibilidad='en_stock';
alter table public.variantes_producto alter column disponibilidad set default 'bajo_pedido';
alter table public.variantes_producto add constraint disponibilidad_por_pedido
 check(disponibilidad in ('bajo_pedido','no_disponible'));
alter table public.variantes_producto add constraint precio_segun_modalidad check (
 (tipo_precio='fijo' and precio is not null and moneda is not null)
 or (tipo_precio='a_acordar' and precio is null and moneda is null)
);
comment on column public.variantes_producto.stock is 'Campo histórico, sin uso comercial ni validaciones de cantidad en el catálogo. No solicitar al administrador.';
comment on column public.variantes_producto.tipo_precio is 'fijo: importe y moneda obligatorios; a_acordar: ambos NULL, nunca cero como sustituto.';
comment on column public.variantes_producto.plazo_produccion_dias is 'Opcional: NULL significa plazo a coordinar con el vendedor.';
-- Ejemplo autorizado: permite probar precio fijo y cotización variable.
update public.variantes_producto v set tipo_precio='a_acordar',precio=null,moneda=null
from public.productos p where p.id=v.producto_id and p.es_ejemplo and v.sku='DEMO-MAC-M-PLA-CEL';
