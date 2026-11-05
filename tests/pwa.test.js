import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { registerPwa } from '../src/lib/pwa.js'
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8')

function worker({ offline = false, missing = false } = {}) {
 const handlers = {}, calls = [], response = new Response('Página actual'), fallback = new Response('Sin conexión')
 const cache = { add: async req => calls.push(['add', req.url]), match: async path => { calls.push(['match',path]); return missing ? undefined : fallback } }
 const caches = { open: async name => { calls.push(['open',name]); return cache }, keys: async () => ['mostacho-offline-v0','mostacho-offline-v1','otra-aplicacion'], delete: async name => calls.push(['delete',name]) }
 const self = { location: { origin:'https://mostacho.example' }, addEventListener: (name, fn) => {handlers[name]=fn}, skipWaiting: async () => calls.push(['skip']), clients: {claim: async () => calls.push(['claim'])} }
 vm.runInNewContext(read('public/sw.js'), { self, caches, URL, Response, Request: class {constructor(url){this.url=url}}, fetch: async req => {calls.push(['fetch',req.url]); if(offline)throw Error('Sin red'); return response} })
 return { handlers, calls, response, fallback }
}
const request = (path = '/', extra = {}) => ({url:'https://mostacho.example'+path,method:'GET',mode:'navigate',...extra})
async function navigate(w, req = request()) {let promise;w.handlers.fetch({request:req,respondWith: value => {promise=value}});return promise ? await promise : null}

test('manifest instalable e iconos PNG cuadrados con dimensiones declaradas',()=>{
 const manifest=JSON.parse(read('public/manifest.webmanifest'))
 assert.equal(manifest.id,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.start_url,'/');assert.equal(manifest.display,'standalone')
 assert.ok(manifest.icons.some(i=>i.sizes==='192x192'));assert.ok(manifest.icons.some(i=>i.sizes==='512x512'));assert.ok(manifest.icons.some(i=>i.purpose==='maskable'))
 for(const icon of [...manifest.icons,{src:'/pwa/apple-touch-icon.png',sizes:'180x180'}]){
  const data=readFileSync(new URL('../public'+icon.src,import.meta.url))
  const [width,height]=icon.sizes.split('x').map(Number)
  assert.equal(data.subarray(1,4).toString(),'PNG');assert.equal(data.readUInt32BE(16),width);assert.equal(data.readUInt32BE(20),height)
 }
 assert.ok(read('index.html').includes('rel="manifest"'));assert.ok(read('index.html').includes('rel="apple-touch-icon"'))
})

test('iPhone recibe el PNG declarado y el icono convencional de la raíz', () => {
 const html = read('index.html')
 const tag = html.match(/<link\b[^>]*rel="apple-touch-icon"[^>]*>/)?.[0]
 assert.ok(tag)
 assert.match(tag, /sizes="180x180"/)
 assert.match(tag, /type="image\/png"/)
 const href = tag.match(/href="([^"]+)"/)[1]
 const path = new URL(href, 'https://mostacho.example').pathname
 assert.equal(path, '/apple-touch-icon.png')
 const png = readFileSync(new URL('../public' + path, import.meta.url))
 assert.equal(png.readUInt32BE(16), 180)
 assert.equal(png.readUInt32BE(20), 180)
 assert.deepEqual(png, readFileSync(new URL('../public/pwa/apple-touch-icon.png', import.meta.url)))
})
test('worker instala solo pantalla pública sin conexión y limpia solo su caché antigua',async()=>{
 const w=worker();let promise
 w.handlers.install({waitUntil:value=>{promise=value}});await promise
 assert.deepEqual(w.calls.filter(c=>c[0]==='add'),[['add','/offline.html']])
 w.handlers.activate({waitUntil:value=>{promise=value}});await promise
 assert.deepEqual(w.calls.filter(c=>c[0]==='delete'),[['delete','mostacho-offline-v0']])
 assert.ok(w.calls.some(c=>c[0]==='claim'))
})
test('navegaciones usan red sin guardar HTML ni sesiones; sin red ofrecen pantalla genérica',async()=>{
 const online=worker();assert.equal(await navigate(online,request('/admin/actualizar-clave?code=privado')),online.response)
 assert.deepEqual(online.calls.map(c=>c[0]),['fetch'])
 const offline=worker({offline:true});assert.equal(await navigate(offline,request('/productos/maceta')),offline.fallback)
 assert.ok(!offline.calls.some(c=>c[0]==='add'))
 const missing=worker({offline:true,missing:true});assert.equal((await navigate(missing)).status,503)
})
test('API, Storage, archivos estáticos y escrituras no se interceptan',async()=>{
 const w=worker()
 for(const req of [request('/rest/v1/productos',{mode:'cors'}),request('/assets/app.js',{mode:'no-cors'}),request('/admin',{method:'POST'}),request('/',{url:'https://db.supabase.co/storage/v1/object/sign/privado'})]) assert.equal(await navigate(w,req),null)
 assert.equal(w.calls.length,0)
})
test('registro requiere contexto seguro, espera carga y no fuerza recargas',async()=>{
 let load;const calls=[]
 const browser={isSecureContext:true,document:{readyState:'loading'},navigator:{serviceWorker:{register:async(...args)=>calls.push(args)}},addEventListener:(name,fn)=>{assert.equal(name,'load');load=fn}}
 registerPwa(browser);assert.equal(calls.length,0);load();await Promise.resolve()
 assert.equal(calls[0][0],'/sw.js');assert.equal(calls[0][1].updateViaCache,'none')
 registerPwa({...browser,isSecureContext:false});assert.equal(calls.length,1)
 registerPwa({...browser,navigator:{}});assert.equal(calls.length,1)
})
test('Vercel preserva rutas de archivos y permite navegación SPA sin extensión',()=>{
 const config=JSON.parse(read('vercel.json'));const pattern=new RegExp('^'+config.rewrites[0].source+'$')
 for(const path of ['/','/catalogo','/carrito','/admin/actualizar-clave','/productos/maceta']) assert.ok(pattern.test(path))
 for(const path of ['/sw.js','/manifest.webmanifest','/offline.html','/pwa/icon-192.png','/assets/index.js']) assert.ok(!pattern.test(path))
 assert.ok(config.headers.find(h=>h.source==='/sw.js').headers.some(h=>h.key==='Cache-Control' && h.value.includes('no-cache')))
})
