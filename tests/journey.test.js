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

test('inicio conserva destacados sin categorías y un acceso principal al catálogo', async () => {
 const requests = []
 const api = backend([product(1)])
 const view = await mountApp('/', [], async (input, options) => { requests.push(new URL(input)); return api(input, options) })
 try {
  const headings = view.renderer.root.findAllByType('h2')
  assert.ok(headings.some(node => node.children.includes('Destacados')))
  assert.ok(!text(view).includes('Categorías y destacados'))
  assert.ok(!text(view).includes('Hablemos de tu idea'))
  assert.ok(!text(view).includes('El catálogo está tomando forma.'))
  assert.ok(text(view).includes('Encontrá tu próxima idea favorita.'))
  assert.ok(view.renderer.root.findAllByType('h3').some(node => node.findAllByType('a').some(link => link.children.includes('Diseño Ñ 1'))))
  assert.ok(!requests.some(url => url.pathname.endsWith('/categorias')))
 } finally { await view.close() }
})

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
test('galería cambia de foto, muestra cuidados opcionales y conserva cantidades y selección',async()=>{
 const row=product(8,true)
 row.instrucciones_cuidado='Limpiar con un paño húmedo.'
 row.imagenes_producto=[1,2].map(n=>({id:uuid(800+n),storage_path:`products/test-${n}.webp`,texto_alternativo:`Vista ${n}`,orden:n}))
 const fetcher=backend([row])
 const view=await mountApp('/productos/diseno-8',[],async(input,options)=>{
  if(String(input).includes('/storage/'))return new Response(JSON.stringify([1,2].map(n=>({path:`products/test-${n}.webp`,signedURL:`/test-${n}.webp?token=test`}))),{headers:{'Content-Type':'application/json'}})
  return fetcher(input,options)
 })
 try{
  const root=view.renderer.root
  const named=name=>root.findAllByType('button').find(b=>b.props['aria-label']===name)
  assert.equal(named('Imagen anterior').props.disabled,true)
  assert.equal(named('Ver imagen 1').props['aria-pressed'],true)
  await act(async()=>named('Imagen siguiente').props.onClick())
  assert.equal(named('Imagen siguiente').props.disabled,true)
  assert.equal(named('Ver imagen 2').props['aria-pressed'],true)
  assert.ok(root.findAllByType('img').some(img=>img.props.alt==='Vista 2'))
  await act(async()=>named('Ver imagen 1').props.onClick())
  assert.equal(named('Ver imagen 1').props['aria-pressed'],true)
  await act(async()=>named('Aumentar cantidad').props.onClick())
  assert.equal(root.findByProps({id:'quantity'}).props.value,'2')
  await act(async()=>named('Reducir cantidad').props.onClick())
  assert.equal(root.findByProps({id:'quantity'}).props.value,'1')
  assert.equal(named('Reducir cantidad').props.disabled,true)
  assert.ok(text(view).includes('Acordar con el vendedor'))
  assert.ok(text(view).includes('Limpiar con un paño húmedo.'))
  assert.ok(root.findAllByType('summary').some(s=>s.children.includes('Cuidados')))
  assert.ok(!/lucide-star|rating|valoración/.test(text(view)))
 }finally{await view.close()}
})

test('producto sin variantes conserva consulta directa y permite preparar carrito con precio fijo',async()=>{
 const row=product(9);row.variantes_producto=[];row.tipo_precio='fijo';row.precio='12500.50';row.moneda='ARS'
 const view=await mountApp('/productos/diseno-9',[],backend([row]))
 try{
  assert.ok(text(view).includes('12.500,50'))
  assert.ok(!text(view).includes('Acordar con el vendedor'))
  assert.ok(text(view).includes('Consultar este producto'))
  assert.ok(button(view,'Agregar al carrito'))
  await act(async()=>button(view,'Agregar al carrito').props.onClick())
  assert.deepEqual(view.context().items,[{productId:row.id,quantity:1}])
  await clickLink(view,'/carrito')
  await act(async()=>{await button(view,'Actualizar y preparar consulta').props.onClick()})
  const send=view.renderer.root.findAllByType('a').find(a=>String(a.props.href).includes('wa.me/5493816795568?text='))
  assert.ok(send)
  const message=new URL(send.props.href).searchParams.get('text')
  assert.ok(message.includes(row.nombre))
  assert.ok(message.includes('12.500,50'))
  assert.ok(!message.includes('SKU:'))
 }finally{await view.close()}
})

test('producto publicado sin variantes ni cuidados muestra consulta y omite cuidados',async()=>{
 const row=product(7);row.variantes_producto=[];row.instrucciones_cuidado=null
 const view=await mountApp('/productos/diseno-7',[],backend([row]))
 try{
  assert.ok(text(view).includes('Diseño Ñ 7'))
  assert.ok(text(view).includes('Consultar este producto'))
  const inquiry=view.renderer.root.findAllByType('a').find(a=>a.children.includes('Consultar este producto'))
  assert.ok(inquiry)
  const destination=new URL(inquiry.props.href)
  assert.equal(destination.origin,'https://wa.me')
  assert.equal(destination.pathname,'/5493816795568')
  assert.equal(destination.searchParams.get('text'),`estoy interesado en este producto ("${row.nombre}")`)
  assert.equal(inquiry.props.target,'_blank')
  assert.ok(!text(view).includes('Cuidados'))
  assert.ok(button(view,'Agregar al carrito'))
  await act(async()=>button(view,'Agregar al carrito').props.onClick())
  assert.deepEqual(view.context().items,[{productId:row.id,quantity:1}])
  await clickLink(view,'/carrito')
  await act(async()=>{await button(view,'Actualizar y preparar consulta').props.onClick()})
  const send=view.renderer.root.findAllByType('a').find(a=>String(a.props.href).includes('wa.me/5493816795568?text='))
  assert.ok(send)
  const message=new URL(send.props.href).searchParams.get('text')
  assert.ok(message.includes('Total: Acordar con el vendedor'))
  assert.ok(!message.includes('$'))
 }finally{await view.close()}
})

test('variantes inactivas/no disponibles, foto ausente y producto oculto se resuelven sin ofrecer compra',async()=>{
 const inactive=product(3);inactive.variantes_producto[0].activa=false
 const view=await mountApp('/productos/diseno-3',[],backend([inactive]))
 try{
  assert.ok(text(view).includes('Consultá las opciones de este producto'))
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
  assert.ok(view.renderer.root.findAllByType('a').some(a=>a.props.href==='/catalogo?pagina=2' && a.props.rel==='next'))
  await clickLink(view,'/catalogo?pagina=2')
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10))})
  assert.ok(view.renderer.root.findAllByType('span').some(s=>s.children.join('')==='Página 2 de 3'))
  assert.ok(requests.some(url=>url.pathname.endsWith('/productos') && url.searchParams.get('offset')==='12' && url.searchParams.get('limit')==='12'))
  assert.ok(view.renderer.root.findAllByType('a').some(a=>a.props.href==='/productos/diseno-13'))
 }finally{await view.close()}
})

test('paginación conserva búsqueda y categoría; limpiar filtros funciona con resultados visibles', async () => {
 const requests = [], api = backend(Array.from({length:25}, (_, i) => product(i + 1)))
 const view = await mountApp('/catalogo?q=maceta&categoria=hogar', [], async input => { requests.push(new URL(input)); return api(input) })
 try {
  assert.ok(button(view, 'Limpiar filtros'))
  assert.ok(view.renderer.root.findAllByType('a').some(link => link.props.href === '/catalogo?q=maceta&categoria=hogar&pagina=2'))
  await clickLink(view, '/catalogo?q=maceta&categoria=hogar&pagina=2')
  assert.ok(requests.some(url => url.searchParams.get('offset') === '12' && url.searchParams.get('categorias.slug') === 'eq.hogar' && url.searchParams.get('nombre')?.includes('maceta')))
  assert.equal(document.querySelector('link[rel="canonical"]').attributes.href, 'https://example.com/catalogo?q=maceta&categoria=hogar&pagina=2')
  await act(async () => button(view, 'Limpiar filtros').props.onClick())
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 15)) })
  assert.ok(!button(view, 'Limpiar filtros'))
  assert.equal(document.querySelector('link[rel="canonical"]').attributes.href, 'https://example.com/catalogo')
  assert.equal(document.querySelector('meta[name="robots"]').attributes.content, 'index,follow')
  assert.ok(view.renderer.root.findAllByType('a').some(link => link.props.href === '/catalogo?pagina=2'))
  assert.equal(requests.filter(url => url.pathname.endsWith('/categorias')).length, 1, 'La búsqueda y paginación no deben volver a cargar las categorías')
 } finally { await view.close() }
})

test('fallo de categorías no oculta productos y su reintento no vuelve a cargar el catálogo', async () => {
 let failCategories = true, productRequests = 0
 const api = backend([product(1)])
 const view = await mountApp('/catalogo', [], async input => {
  const url = new URL(input)
  if (url.pathname.endsWith('/categorias') && failCategories) return new Response(JSON.stringify({ message: 'Fallo de categorías' }), { status: 400 })
  if (url.pathname.endsWith('/productos')) productRequests++
  return api(input)
 })
 try {
  assert.ok(text(view).includes('Diseño Ñ 1'))
  assert.ok(text(view).includes('No pudimos cargar las categorías.'))
  failCategories = false
  await act(async () => button(view, 'Reintentar categorías').props.onClick())
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 15)) })
  assert.ok(!button(view, 'Reintentar categorías'))
  assert.equal(productRequests, 1)
  assert.ok(view.renderer.root.findAllByType('option').some(option => option.children.includes('Decoración')))
 } finally { await view.close() }
})

test('página fuera de rango normaliza la URL y sus metadatos al volver a la primera', async () => {
 const api = backend([product(1)])
 const view = await mountApp('/catalogo?pagina=10', [], async input => {
  const url = new URL(input)
  if (url.pathname.endsWith('/productos') && Number(url.searchParams.get('offset')) > 0) return new Response(JSON.stringify({code:'PGRST103',message:'Fuera de rango'}), {status:416})
  return api(input)
 })
 try {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
  assert.equal(document.querySelector('link[rel="canonical"]').attributes.href, 'https://example.com/catalogo')
  assert.equal(document.title, 'Catálogo · Mostacho 3D')
  assert.ok(text(view).includes('Diseño Ñ 1'))
 } finally { await view.close() }
})
