-- Copia preparada para GitHub: se omiten los correos del bootstrap original.
-- En una instalación nueva, autorizar cuentas fuera del repositorio:
-- ver PREPARACION_GITHUB.md. No se otorgan accesos automáticamente.
-- No volver a ejecutar esta migración en el proyecto donde ya fue aplicada.
-- Una política explícita documenta que la autorización no puede editarse desde la API.
create policy sin_acceso_api on private.administradores for all to anon, authenticated using (false) with check (false);
create policy sin_acceso_api on private.correos_administradores for all to anon, authenticated using (false) with check (false);

-- Solo desarrollo: ejemplo en borrador sin foto ficticia ni URL inventada.
do $$
declare categoria uuid; material uuid; blanco uuid; celeste uuid; producto uuid;
begin
 insert into public.categorias(nombre,slug,descripcion) values ('Decoración (ejemplo)','decoracion-ejemplo','Categoría de prueba, no comercial.') returning id into categoria;
 insert into public.materiales(nombre,descripcion) values ('PLA (ejemplo)','Material ilustrativo.') returning id into material;
 insert into public.colores(nombre,codigo_hex) values ('Blanco (ejemplo)','#FFFFFF') returning id into blanco;
 insert into public.colores(nombre,codigo_hex) values ('Celeste (ejemplo)','#BCE8F7') returning id into celeste;
 insert into public.productos(categoria_id,nombre,slug,descripcion,publicado,es_ejemplo)
 values (categoria,'Maceta geométrica (ejemplo)','maceta-geometrica-ejemplo','Producto ficticio. No está a la venta.',false,true) returning id into producto;
 insert into public.variantes_producto(producto_id,material_id,color_id,sku,nombre,ancho_mm,alto_mm,profundidad_mm,precio,moneda,disponibilidad,stock,plazo_produccion_dias)
 values (producto,material,blanco,'DEMO-MAC-P-PLA-BLA','Pequeña · PLA · Blanco',80,90,80,5000,'ARS','en_stock',3,null),
 (producto,material,celeste,'DEMO-MAC-M-PLA-CEL','Mediana · PLA · Celeste',120,140,120,8000,'ARS','bajo_pedido',null,3);
end;
$$;
