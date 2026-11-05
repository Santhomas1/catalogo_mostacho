import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mountEditor, act, closeClient } from './react-harness.js'
const pid='00000000-0000-4000-8000-000000000001'
const refs={categorias:[{id:'cat',nombre:'Decoración',activa:true}],materiales:[{id:'mat',nombre:'PLA',activo:true}],colores:[{id:'color',nombre:'Blanco',activo:true}]}
const root=view=>view.renderer.root
function field(view,name){const label=root(view).findAllByType('label').find(l=>l.findAllByType('span')[0]?.children.join('')===name);assert.ok(label,name);return label.findAll(n=>['input','select','textarea'].includes(n.type))[0]}
const button=(view,text)=>root(view).findAllByType('button').find(b=>b.children.includes(text))

test('crear borrador genera slug y no habilita publicar sin foto',async()=>{
 let saved,created
 const service={references:async()=>refs,save:async(table,values)=>{saved={table,values};return {id:pid}}}
 const view=await mountEditor('product',{id:'new',service,client:{},onClose(){},onCreated:id=>{created=id}})
 try{
  assert.equal(field(view,'Publicado en el catálogo').props.disabled,true)
  await act(async()=>{field(view,'Nombre').props.onChange({target:{value:'Maceta Ñandú'}});field(view,'Categoría').props.onChange({target:{value:'cat'}})})
  assert.equal(field(view,'Dirección corta (slug)').props.value,'maceta-nandu')
  await act(async()=>{root(view).findByType('form').props.onSubmit({preventDefault(){}})})
  assert.equal(saved.table,'productos');assert.equal(saved.values.publicado,false);assert.equal(created,pid)
 }finally{await view.close()}
})

test('publica con foto sin variantes y guarda los cuidados vacíos como null',async()=>{
 let saved
 const product={id:pid,nombre:'Maceta',slug:'maceta',categoria_id:'cat',publicado:false,imagenes_producto:[{id:'foto'}],variantes_producto:[],instrucciones_cuidado:null}
 const service={references:async()=>refs,product:async()=>product,save:async(table,values)=>{saved={table,values};return product}}
 const view=await mountEditor('product',{id:pid,service,client:{},onClose(){},onCreated(){}})
 try{
  assert.ok(!field(view,'Publicado en el catálogo').props.disabled)
  assert.ok(!field(view,'Instrucciones de cuidado (opcional)').props.required)
  await act(async()=>{field(view,'Publicado en el catálogo').props.onChange({target:{checked:true}})})
  await act(async()=>{root(view).findByType('form').props.onSubmit({preventDefault(){}})})
  assert.equal(saved.table,'productos')
  assert.equal(saved.values.publicado,true)
  assert.equal(saved.values.instrucciones_cuidado,null)
 }finally{await view.close()}
})
test('formulario de variante a acordar envía nulos y no solicita stock',async()=>{
 let saved
 const view=await mountEditor('variant',{product:{id:pid,variantes_producto:[]},references:refs,service:{save:async(table,values)=>{saved={table,values}}},onChanged(){}})
 try{
  await act(async()=>{button(view,'Agregar variante').props.onClick()})
  await act(async()=>{
   field(view,'Nombre de la opción (incluí el tamaño)').props.onChange({target:{value:'Personalizada'}})
   field(view,'SKU único').props.onChange({target:{value:'CUSTOM-1'}})
   field(view,'Material').props.onChange({target:{value:'mat'}})
   field(view,'Color').props.onChange({target:{value:'color'}})
   field(view,'Modalidad de precio').props.onChange({target:{value:'a_acordar'}})
  })
  assert.ok(!root(view).findAllByType('label').some(l=>l.findAllByType('span')[0]?.children.join('')==='Precio'))
  await act(async()=>{root(view).findByType('form').props.onSubmit({preventDefault(){}})})
  assert.equal(saved.values.precio,null);assert.equal(saved.values.moneda,null);assert.ok(!('stock'in saved.values))
 }finally{await view.close()}
})
test('eliminar registro exige confirmar y cancelar no elimina',async()=>{
 let removed=0
 const record={id:pid,nombre:'Categoría',slug:'categoria',activa:true,orden:0}
 const service={list:async()=>({rows:[record],count:1,page:1}),remove:async()=>{removed++}}
 const view=await mountEditor('registry',{table:'categorias',service})
 try{
  await act(async()=>{button(view,'Editar').props.onClick()})
  await act(async()=>{button(view,'Eliminar definitivamente').props.onClick()})
  assert.equal(removed,0)
  const cancel=root(view).findAllByType('button').filter(b=>b.children.includes('Cancelar')).at(-1)
  await act(async()=>{cancel.props.onClick()})
  assert.equal(removed,0)
  await act(async()=>{button(view,'Eliminar definitivamente').props.onClick()})
  await act(async()=>{button(view,'Sí, eliminar definitivamente').props.onClick()})
  assert.equal(removed,1)
 }finally{await view.close()}
})
after(closeClient)
