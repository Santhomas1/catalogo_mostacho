import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { mountAdmin, mountAuthForm, act, closeClient } from './react-harness.js'

function fakeSession({allowed=false,signedIn=true}={}){
 let listener=()=>{}
 const client=createClient('https://example.invalid','sb_publishable_test',{auth:{persistSession:false,autoRefreshToken:false,storageKey:crypto.randomUUID()},global:{fetch:async input=>new Response(JSON.stringify(String(input).includes('/rpc/mi_acceso_admin')?allowed:[]),{status:200,headers:{'Content-Type':'application/json','Content-Range':'*/0'}})}})
 client.auth.getUser=async()=>signedIn?{data:{user:{id:'user',email:'admin@example.invalid',user_metadata:{admin:true}}}}:{error:{name:'AuthSessionMissingError'}}
 client.auth.onAuthStateChange=cb=>{listener=cb;return {data:{subscription:{unsubscribe(){}}}}}
 client.auth.signOut=async()=>{signedIn=false;listener('SIGNED_OUT');return {error:null}}
 return client
}
const text=view=>JSON.stringify(view.renderer.toJSON())

test('cuenta sin rol no ve formularios aunque tenga metadata admin y puede cerrar sesión',async()=>{
 const client=fakeSession(),view=await mountAdmin(client)
 try{
  assert.ok(text(view).includes('Esta cuenta no tiene permiso.'))
  assert.ok(!text(view).includes('Nuevo producto'))
  const logout=view.renderer.root.findAllByType('button').find(b=>b.children.includes('Cerrar sesión'))
  await act(async()=>{await logout.props.onClick()})
  assert.ok(text(view).includes('Iniciar sesión'))
 }finally{await view.close();await client.auth.dispose()}
})
test('administrador autorizado ve las secciones y el listado real, sin campos de stock',async()=>{
 const client=fakeSession({allowed:true}),view=await mountAdmin(client)
 try{
  for(const value of ['Nuevo producto','Categorías','Materiales','Colores','Limpieza de archivos'])assert.ok(text(view).includes(value),value)
  assert.ok(!text(view).includes('type":"password'))
 }finally{await view.close();await client.auth.dispose()}
})
test('envíos duplicados de login se bloquean y credenciales incorrectas se explican',async()=>{
 let calls=0,finish
 const client={auth:{signInWithPassword:()=>{calls++;return new Promise(resolve=>{finish=resolve})}}}
 const view=await mountAuthForm('login',client)
 try{
  const inputs=view.renderer.root.findAllByType('input')
  await act(async()=>{inputs[0].props.onChange({target:{value:'admin@example.invalid'}});inputs[1].props.onChange({target:{value:'not-a-real-password'}})})
  const submit=view.renderer.root.findByType('form').props.onSubmit
  await act(async()=>{submit({preventDefault(){}});submit({preventDefault(){}})})
  assert.equal(calls,1)
  assert.equal(view.renderer.root.findByType('fieldset').props.disabled,true)
  await act(async()=>{finish({error:{code:'invalid_credentials'}})})
  assert.ok(text(view).includes('El correo o la contraseña no son correctos.'))
 }finally{await view.close()}
})
test('recuperación usa URL del mismo sitio y no revela si existe la cuenta',async()=>{
 let request
 const view=await mountAuthForm('recovery',{auth:{resetPasswordForEmail:async(email,options)=>{request={email,options};return {error:null}}}})
 try{
  await act(async()=>{view.renderer.root.findByType('input').props.onChange({target:{value:'admin@example.invalid'}})})
  await act(async()=>{view.renderer.root.findByType('form').props.onSubmit({preventDefault(){}})})
  assert.equal(request.options.redirectTo,'https://example.com/admin/actualizar-clave')
  assert.ok(text(view).includes('Si el correo corresponde a una cuenta'))
 }finally{await view.close()}
})
test('cambio de contraseña no llama Auth si los valores no coinciden',async()=>{
 let called=false
 const view=await mountAuthForm('password',{auth:{updateUser:async()=>{called=true;return {error:null}}}})
 try{
  const inputs=view.renderer.root.findAllByType('input')
  await act(async()=>{inputs[0].props.onChange({target:{value:'example-password-one'}});inputs[1].props.onChange({target:{value:'example-password-two'}})})
  await act(async()=>{view.renderer.root.findByType('form').props.onSubmit({preventDefault(){}})})
  assert.equal(called,false)
  assert.ok(text(view).includes('Las contraseñas no coinciden.'))
 }finally{await view.close()}
})
after(closeClient)
