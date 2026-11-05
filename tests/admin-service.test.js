import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { createAdminService, variantPayload, slugify } from '../src/admin/admin-service.js'
import { verifyAdminSession, authMessage } from '../src/admin/auth-service.js'
const pid='00000000-0000-4000-8000-000000000001'
function clientWith(fetcher) { return createClient('https://example.invalid','sb_publishable_test',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:fetcher}}) }
const json=data=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}})

test('permiso administrativo se verifica en servidor, nunca desde metadata del usuario',async()=>{
 let calls=0
 const client={auth:{getUser:async()=>({data:{user:{id:'user',user_metadata:{admin:true}}}})}}
 const result=await verifyAdminSession(client,{access:async()=>{calls++;return false}})
 assert.equal(calls,1); assert.equal(result.status,'denied')
 assert.equal((await verifyAdminSession(client,{access:async()=>true})).status,'ready')
})
test('sesión faltante o vencida vuelve al acceso; error de red no autoriza',async()=>{
 for(const error of [{name:'AuthSessionMissingError'},{status:401},{code:'refresh_token_not_found'}]){
  const result=await verifyAdminSession({auth:{getUser:async()=>({error})}},{access:async()=>{throw Error('No debe consultar rol')}})
  assert.equal(result.status,'signedout')
 }
 await assert.rejects(verifyAdminSession({auth:{getUser:async()=>({error:Error('red')})}},{access:async()=>true}))
 assert.ok(authMessage({code:'invalid_credentials'}).includes('no son correctos'))
})
test('modalidad a acordar elimina importe y moneda; sin stock en payload persistido',()=>{
 const quote=variantPayload({tipo_precio:'a_acordar',precio:'999',moneda:'ARS',ancho_mm:'',alto_mm:'',profundidad_mm:'',peso_g:'',plazo_produccion_dias:''})
 assert.equal(quote.precio,null);assert.equal(quote.moneda,null);assert.equal(quote.plazo_produccion_dias,null)
 assert.throws(()=>variantPayload({tipo_precio:'fijo',precio:'',moneda:'ARS'}))
 assert.throws(()=>variantPayload({tipo_precio:'fijo',precio:'-1',moneda:'ARS'}))
 assert.throws(()=>variantPayload({tipo_precio:'fijo',precio:'500',moneda:'ARS',plazo_produccion_dias:'1.5'}))
 assert.equal(slugify('Maceta: edición Ñ'),'maceta-edicion-n')
})
test('guardar solo persiste columnas permitidas y aplica control de cambios simultáneos',async()=>{
 let url,payload
 const service=createAdminService(clientWith(async(input,options)=>{url=new URL(input);payload=JSON.parse(options.body);return json({id:pid,...payload})}))
 await service.save('productos',{nombre:'Nombre',publicado:false,es_ejemplo:false,usuario_id:'ataque',creado_en:'ayer'}, {id:pid,actualizado_en:'2026-11-04T12:00:00Z'})
 assert.deepEqual(payload,{nombre:'Nombre',publicado:false})
 assert.equal(url.searchParams.get('id'),`eq.${pid}`)
 assert.equal(url.searchParams.get('actualizado_en'),'eq.2026-11-04T12:00:00Z')
 await assert.rejects(service.save('administradores',{activo:true}))
})
test('guardar variante excluye el stock histórico y campos de rol',async()=>{
 let payload
 const service=createAdminService(clientWith(async(_,options)=>{payload=JSON.parse(options.body);return json({id:pid,...payload})}))
 await service.save('variantes_producto',{producto_id:pid,nombre:'Opción',stock:999,role:'admin',tipo_precio:'a_acordar',precio:null,moneda:null})
 assert.ok(!('stock'in payload));assert.ok(!('role'in payload));assert.equal(payload.tipo_precio,'a_acordar')
})
test('eliminación sin filas no se informa como éxito y el orden se envía a RPC atómico',async()=>{
 const service=createAdminService(clientWith(async()=>json([])))
 await assert.rejects(service.remove('productos',{id:pid}),/No se eliminó/)
 let url,payload
 const ordered=createAdminService(clientWith(async(input,options)=>{url=String(input);payload=JSON.parse(options.body);return json(null)}))
 await ordered.reorder(pid,['one','two'])
 assert.ok(url.endsWith('/rpc/reordenar_imagenes'))
 assert.deepEqual(payload,{p_producto_id:pid,p_imagenes:['one','two']})
})
