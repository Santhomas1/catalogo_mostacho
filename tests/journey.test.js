import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mountApp, mountCart, act, closeClient } from './react-harness.js'
const uuid = n => `00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`
function product(n, quote=false) {
 return {id:uuid(n),nombre:`Diseño Ñ ${n}`,slug:`diseno-${n}`,publicado:true,es_ejemplo:false,categorias:{id:uuid(100),nombre:'Decoración',slug:'decoracion',activa:true},imagenes_producto:[],variantes_producto:[{id:uuid(1000+n),sku:`SKU-${n}`,nombre:'PLA · Blanco · Tamaño a elección',activa:true,tipo_precio:quote?'a_acordar':'fijo',precio:quote?null:'5000.00',moneda:quote?null:'ARS',disponibilidad:'bajo_pedido',plazo_produccion_dias:null,ancho_mm:null,alto_mm:null,profundidad_mm:null,materiales:{nombre:'PLA',activo:true},colores:{nombre:'Blanco',activo:true}}]}
}
function backend(rows) {
 return async input => {
  const url=new URL(input);let data=[];let count=0
  const selected=(url.searchParams.get('id') || '').match(/[0-9a-f-]{36}/g) || []
  if(url.pathname.endsWith('/categorias')) data=rows.length?[{id:uuid(100),nombre:'Decoración',slug:'decoracion',productos:[{id:rows[0].id}]}]:[]
  else if(url.pathname.endsWith('/variantes_producto')) data=rows.flatMap(p=>p.variantes_producto.filter(v=>selected.includes(v.id)).map(v=>({id:v.id,producto_id:p.id})))
  else {
   data=rows.filter(p=>p.publicado && !p.es_ejemplo && p.categorias.activa)
   const slug=url.searchParams.get('slug');if(slug)data=data.filter(p=>p.slug===slug.slice(3))
   if(selected.length)data=data.filter(p=>selected.includes(p.id))
   count=data.length
   const offset=Number(url.searchParams.get('offset') || 0),limit=Number(url.searchParams.get('limit') || 1000)
   data=data.slice(offset,offset+limit)
  }
  return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json','Content-Range':`0-${Math.max(0,data.length-1)}/${count}`}})
 }
}
const buttons=view=>view.renderer.root.findAllByType('button')
const button=(view,text)=>buttons(view).find(b=>b.children.includes(text))
const text=view=>JSON.stringify(view.renderer.toJSON())
async function clickLink(view,path){
 const link=view.renderer.root.findAllByType('a').find(a=>a.props.href===path)
 assert.ok(link,path)
 await act(async()=>{link.props.onClick({button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true}})})
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10))})
}

test('recorrido de dos productos: catálogo, detalle, cantidades, seguir eligiendo y consulta única',async()=>{
 const view=await mountApp('/catalogo',[],backend([product(1),product(2,true)]))
 try{
  await clickLink(view,'/productos/diseno-1')
  assert.equal(view.path(),'/productos/diseno-1')
  assert.equal(document.title,'Diseño Ñ 1 · Mostacho 3D')
  await act(async()=>{view.renderer.root.findByProps({id:'quantity'}).props.onChange({target:{value:'2'}})})
  await act(async()=>{button(view,'Agregar al carrito').props.onClick()})
  await clickLink(view,'/carrito')
  await clickLink(view,'/catalogo')
  await clickLink(view,'/productos/diseno-2')
  await act(async()=>{view.renderer.root.findByProps({id:'quantity'}).props.onChange({target:{value:'3'}})})
  await act(async()=>{button(view,'Agregar al carrito').props.onClick()})
  await clickLink(view,'/carrito')
  await act(async()=>{await button(view,'Actualizar y preparar consulta').props.onClick()})
  const send=view.renderer.root.findAllByType('a').find(a=>String(a.props.href).includes('wa.me/5493816795568?text='))
  assert.ok(send)
  const summary=decodeURIComponent(send.props.href)
  for(const fragment of ['Diseño Ñ 1','Diseño Ñ 2','SKU-1','SKU-2','Cantidad: 2','Cantidad: 3','10.000,00','Acordar con el vendedor','Total final a confirmar'])assert.ok(summary.includes(fragment),fragment)
  assert.equal(view.context().items.length,2)
  assert.equal(JSON.parse(view.memory.get('mostacho-cart-v1')).length,2)
 }finally{await view.close()}
})
test('producto publicado sin variantes ni cuidados muestra consulta y omite cuidados',async()=>{
 const row=product(7);row.variantes_producto=[];row.instrucciones_cuidado=null
 const view=await mountApp('/productos/diseno-7',[],backend([row]))
 try{
  assert.ok(text(view).includes('Diseño Ñ 7'))
  assert.ok(text(view).includes('Consultar este producto'))
  assert.ok(!text(view).includes('Cuidados'))
  assert.ok(!button(view,'Agregar al carrito'))
 }finally{await view.close()}
})

test('variantes inactivas/no disponibles, foto ausente y producto oculto se resuelven sin ofrecer compra',async()=>{
 const inactive=product(3);inactive.variantes_producto[0].activa=false
 const view=await mountApp('/productos/diseno-3',[],backend([inactive]))
 try{
  assert.ok(text(view).includes('Sin opciones disponibles.'))
  assert.ok(text(view).includes('producto-sin-imagen.svg'))
  assert.ok(!button(view,'Agregar al carrito'))
 }finally{await view.close()}
 const unavailable=product(4);unavailable.variantes_producto[0].disponibilidad='no_disponible'
 const other=await mountApp('/productos/diseno-4',[],backend([unavailable]))
 try{assert.equal(button(other,'Agregar al carrito').props.disabled,true)}finally{await other.close()}
 const hidden=product(5);hidden.publicado=false
 const denied=await mountApp('/productos/diseno-5',[],backend([hidden]))
 try{assert.ok(text(denied).includes('Este producto no está disponible.'))}finally{await denied.close()}
})
test('recarga restaura cantidades y quitar la última línea deja carrito vacío',async()=>{
 const api=backend([product(1)])
 const first=await mountCart([{variantId:uuid(1001),quantity:2}],api)
 let stored
 try{await act(async()=>first.context().add(uuid(1001),3));stored=first.memory.get('mostacho-cart-v1');assert.equal(JSON.parse(stored)[0].quantity,5)}finally{await first.close()}
 const second=await mountCart([],api,{stored})
 try{
  assert.equal(second.context().items[0].quantity,5)
  await act(async()=>second.context().update(uuid(1001),0))
  assert.equal(second.context().items[0].quantity,5)
  await act(async()=>second.context().remove(uuid(1001)))
  assert.ok(text(second).includes('Tu carrito está vacío.'))
  assert.equal(second.memory.get('mostacho-cart-v1'),'[]')
 }finally{await second.close()}
})
test('almacenamiento corrupto o bloqueado no impide navegar ni usar carrito durante la visita',async()=>{
 const corrupt=await mountCart([],backend([]),{stored:'{broken'})
 try{assert.ok(corrupt.context().warning);assert.ok(text(corrupt).includes('Tu carrito está vacío.'))}finally{await corrupt.close()}
 const blocked=await mountCart([],backend([product(1)]),{readError:true,writeError:true})
 try{await act(async()=>blocked.context().add(uuid(1001),1));assert.equal(blocked.context().items[0].quantity,1);assert.ok(blocked.context().warning.includes('no se puede guardar'))}finally{await blocked.close()}
})
test('carrito largo ofrece texto completo y conserva selección cuando falla el portapapeles',async()=>{
 const rows=Array.from({length:60},(_,i)=>product(i+1))
 const view=await mountCart(rows.map(p=>({variantId:p.variantes_producto[0].id,quantity:1})),backend(rows))
 const original=Object.getOwnPropertyDescriptor(globalThis,'navigator')
 let copied=''
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async value=>{copied=value;throw Error('denied')}}}})
 try{
  await act(async()=>{await button(view,'Actualizar y preparar consulta').props.onClick()})
  assert.ok(text(view).includes('El resumen es largo.'))
  assert.equal(button(view,'Enviar carrito por WhatsApp').props.disabled,true)
  await act(async()=>{await button(view,'Copiar resumen').props.onClick()})
  assert.ok(copied.includes('SKU-1'));assert.ok(copied.includes('SKU-60'))
  assert.equal(view.renderer.root.findByType('textarea').props.value,copied)
  assert.ok(text(view).includes('Seleccioná y copiá el resumen'))
  assert.equal(view.context().items.length,60)
 }finally{await view.close();if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator}
})
after(closeClient)

test('catálogo de 35 productos solicita páginas de 12 y conserva la navegación',async()=>{
 const requests=[];const api=backend(Array.from({length:35},(_,i)=>product(i+1)))
 const view=await mountApp('/catalogo',[],async input=>{requests.push(new URL(input));return api(input)})
 try{
  assert.ok(view.renderer.root.findAllByType('span').some(s=>s.children.join('')==='Página 1 de 3'))
  assert.equal(new Set(view.renderer.root.findAllByType('a').filter(a=>a.props.href?.startsWith('/productos/')).map(a=>a.props.href)).size,12)
  await act(async()=>{button(view,'Siguiente').props.onClick()})
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10))})
  assert.ok(view.renderer.root.findAllByType('span').some(s=>s.children.join('')==='Página 2 de 3'))
  assert.ok(requests.some(url=>url.pathname.endsWith('/productos') && url.searchParams.get('offset')==='12' && url.searchParams.get('limit')==='12'))
  assert.ok(view.renderer.root.findAllByType('a').some(a=>a.props.href==='/productos/diseno-13'))
 }finally{await view.close()}
})
