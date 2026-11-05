import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mountInstall, act, closeClient } from './react-harness.js'
const button = view => view.renderer.root.findByType('button')
const text = view => JSON.stringify(view.renderer.toJSON())
test('ofrece botón sin evento de instalación y explica alternativa para Firefox',async()=>{
 const view=await mountInstall()
 try{
  assert.ok(text(view).includes('Instalar Mostacho'))
  await act(async()=>{await button(view).props.onClick()})
  assert.ok(text(view).includes('Chrome o Edge'))
 }finally{await view.close()}
})
test('iPhone mantiene botón con instrucciones de Compartir',async()=>{
 const view=await mountInstall({userAgent:'iPhone',platform:'iPhone'})
 try{await act(async()=>{await button(view).props.onClick()});assert.ok(text(view).includes('Compartir'));assert.ok(text(view).includes('Agregar a la pantalla de inicio'))}finally{await view.close()}
})
test('usa diálogo nativo cuando está disponible y oculta invitación al instalar',async()=>{
 const view=await mountInstall({userAgent:'Chrome'})
 let prevented=false,prompted=0
 try{
  await act(async()=>{view.events.get('beforeinstallprompt')({preventDefault(){prevented=true},prompt:async()=>{prompted++},userChoice:Promise.resolve({outcome:'accepted'})})})
  await act(async()=>{await button(view).props.onClick()})
  assert.equal(prevented,true);assert.equal(prompted,1)
  await act(async()=>view.events.get('appinstalled')())
  assert.equal(view.renderer.toJSON(),null)
 }finally{await view.close()}
})
test('no muestra invitación dentro de app independiente',async()=>{
 const view=await mountInstall({standalone:true})
 try{assert.equal(view.renderer.toJSON(),null)}finally{await view.close()}
})
after(closeClient)
