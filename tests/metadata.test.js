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
 assert.ok(productMetadata({name:'Maceta Ñ',description:'  \n  '}).description.includes('Maceta Ñ'))
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
 const doc={title:'',head:{appendChild(tag){tags.push(tag)}},createElement(){return{attributes:{},setAttribute(key,value){this.attributes[key]=value}}},querySelector(selector){if(selector==='link[rel="canonical"]')return tags.find(tag=>tag.attributes.rel==='canonical') || null; const m=selector.match(/^meta\[(name|property)="(.+)"\]$/);return tags.find(tag=>tag.attributes[m[1]]===m[2]) || null}}
 writeMetadata(doc,routeMetadata('/contacto'),'https://example.com','/contacto')
 const count=tags.length
 writeMetadata(doc,productMetadata({name:'Producto nuevo'}),'https://example.com','/productos/nuevo')
 assert.equal(tags.length,count)
 assert.equal(doc.title,'Producto nuevo · Mostacho 3D')
 assert.equal(tags.find(t=>t.attributes.property==='og:url').attributes.content,'https://example.com/productos/nuevo')
 assert.equal(tags.find(t=>t.attributes.property==='og:image').attributes.content,'https://example.com/logo/mostacho.png')
 assert.equal(tags.filter(t=>t.attributes.rel==='canonical').length,1)
 assert.equal(tags.find(t=>t.attributes.rel==='canonical').attributes.href,'https://example.com/productos/nuevo')
})

test('SEO de catálogo distingue paginación, filtros y parámetros de seguimiento', () => {
 const first = routeMetadata('/catalogo/', '?pagina=1&utm_source=instagram')
 assert.equal(first.canonicalPath, '/catalogo')
 assert.equal(first.noIndex, false)
 const second = routeMetadata('/catalogo', '?utm_source=instagram&pagina=2')
 assert.equal(second.canonicalPath, '/catalogo?pagina=2')
 assert.ok(second.title.includes('Página 2'))
 assert.equal(second.noIndex, false)
 const filtered = routeMetadata('/catalogo', '?categoria=hogar&q=+vaso+&pagina=2&utm_source=test')
 assert.equal(filtered.canonicalPath, '/catalogo?q=vaso&categoria=hogar&pagina=2')
 assert.equal(filtered.noIndex, true)
 assert.equal(filtered.followLinks, true)
 for (const page of ['-1','NaN','1.5','0']) assert.equal(routeMetadata('/catalogo', `?pagina=${page}`).canonicalPath, '/catalogo')
})

test('canonical y URL social conservan la página y nunca permiten cambiar el dominio mediante la ruta', () => {
 const tags = []
 const doc = { title: '', head: { appendChild: tag => tags.push(tag) }, createElement: () => ({ attributes: {}, setAttribute(key, value) { this.attributes[key] = value } }), querySelector(selector) {
  if (selector === 'link[rel="canonical"]') return tags.find(tag => tag.attributes.rel === 'canonical') || null
  const match = selector.match(/^meta\[(name|property)="(.+)"\]$/)
  return tags.find(tag => tag.attributes[match[1]] === match[2]) || null
 } }
 writeMetadata(doc, routeMetadata('/catalogo', '?pagina=3'), 'https://example.com', '/catalogo')
 assert.equal(tags.find(tag => tag.attributes.rel === 'canonical').attributes.href, 'https://example.com/catalogo?pagina=3')
 assert.equal(tags.find(tag => tag.attributes.property === 'og:url').attributes.content, 'https://example.com/catalogo?pagina=3')
 writeMetadata(doc, routeMetadata('/catalogo', '?q=vaso'), 'https://example.com', '/catalogo')
 assert.equal(tags.find(tag => tag.attributes.name === 'robots').attributes.content, 'noindex,follow')
 writeMetadata(doc, routeMetadata('//other.example/path'), 'https://example.com', '//other.example/path')
 assert.equal(new URL(tags.find(tag => tag.attributes.rel === 'canonical').attributes.href).origin, 'https://example.com')
})

test('carrito y administración quedan fuera del índice también mediante cabeceras del alojamiento', () => {
 const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
 for (const path of ['/admin', '/admin/:path*', '/carrito', '/carrito/']) {
  assert.ok(config.headers.find(rule => rule.source === path)?.headers.some(header => header.key === 'X-Robots-Tag' && header.value === 'noindex, nofollow'))
 }
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

test('tema conserva blanco y celeste de marca con contraste en texto, botones y formularios', () => {
 const css = readFileSync(new URL('../src/styles/premium.css', import.meta.url), 'utf8')
 const color = name => {
  const matches = [...css.matchAll(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`, 'g'))]
  assert.ok(matches.length, `Falta token ${name}`)
  return matches.at(-1)[1]
 }
 assert.equal(color('background'), '#ffffff')
 assert.equal(color('primary'), '#bce8f7')
 assert.equal(color('primary-foreground'), '#17323b')
 for (const bg of ['background', 'surface-control', 'surface-subtle']) {
  assert.ok(contrast(color('foreground'), color(bg)) >= 4.5, `Texto principal sobre ${bg}`)
  assert.ok(contrast(color('text-muted'), color(bg)) >= 4.5, `Texto secundario sobre ${bg}`)
  assert.ok(contrast(color('control-border'), color(bg)) >= 3, `Controles sobre ${bg}`)
 }
 assert.ok(contrast(color('primary'), color('primary-foreground')) >= 4.5)
 assert.ok(contrast(color('ring'), color('background')) >= 3)
})
