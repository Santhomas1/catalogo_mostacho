import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { routeMetadata, productMetadata, writeMetadata, siteOrigin } from '../src/lib/metadata.js'

test('títulos por ruta, panel y carrito no indexables',()=>{
 assert.notEqual(routeMetadata('/').title,routeMetadata('/catalogo').title)
 assert.ok(routeMetadata('/admin/recuperar').noIndex)
 assert.ok(routeMetadata('/carrito').noIndex)
 assert.ok(routeMetadata('/no-existe').noIndex)
 assert.equal(routeMetadata('/contacto/').title,'Contacto · Mostacho 3D')
 const product=productMetadata({name:'Maceta Ñ',description:'Texto\ncon espacios'})
 assert.equal(product.title,'Maceta Ñ · Mostacho 3D')
 assert.equal(product.description,'Texto con espacios')
})
test('origen de publicación no admite rutas, credenciales ni protocolos inseguros',()=>{
 assert.equal(siteOrigin(''),'')
 assert.equal(siteOrigin('https://mostacho.example/'),'https://mostacho.example')
 assert.throws(()=>siteOrigin('https://user:password@example.com'))
 assert.throws(()=>siteOrigin('javascript:alert(1)'))
 assert.throws(()=>siteOrigin('http://example.com'))
 assert.throws(()=>siteOrigin('https://example.com/ruta'))
})
test('metadatos se actualizan sin duplicar etiquetas ni usar URLs firmadas como imagen social',()=>{
 const tags=[]
 const doc={title:'',head:{appendChild(tag){tags.push(tag)}},createElement(){return{attributes:{},setAttribute(key,value){this.attributes[key]=value}}},querySelector(selector){const m=selector.match(/^meta\[(name|property)="(.+)"\]$/);return tags.find(tag=>tag.attributes[m[1]]===m[2]) || null}}
 writeMetadata(doc,routeMetadata('/contacto'),'https://example.com','/contacto')
 const count=tags.length
 writeMetadata(doc,productMetadata({name:'Producto nuevo'}),'https://example.com','/productos/nuevo')
 assert.equal(tags.length,count)
 assert.equal(doc.title,'Producto nuevo · Mostacho 3D')
 assert.equal(tags.find(t=>t.attributes.property==='og:url').attributes.content,'https://example.com/productos/nuevo')
 assert.equal(tags.find(t=>t.attributes.property==='og:image').attributes.content,'https://example.com/logo/mostacho.png')
})
function luminance(hex){const v=hex.replace('#','').match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]}
const contrast=(a,b)=>{const l=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(l[0]+.05)/(l[1]+.05)}
test('pares de texto cumplen 4.5:1 y límites de controles visibles cumplen 3:1',()=>{
 const css=readFileSync(new URL('../src/styles/globals.css',import.meta.url),'utf8')
 const color=name=>{const match=css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));assert.ok(match,`Falta color ${name}`);return match[1]}
 for(const bg of [color('background'),color('accent'),color('primary')])assert.ok(contrast(color('foreground'),bg)>=4.5)
 assert.ok(contrast('#526971','#ffffff')>=4.5)
 const controlBorder=css.includes('--control-border:')?color('control-border'):color('input')
 assert.ok(contrast(controlBorder,color('background'))>=3, 'El borde actual del campo no alcanza 3:1')
 assert.ok(contrast(color('ring'),color('background'))>=3)
})
