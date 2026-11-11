import {readFile,writeFile,access} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {resolve,join} from 'node:path'
const require=createRequire(import.meta.url), root=resolve('.image-backfill.local')
const sharp=require(join(root,'tools/node_modules/sharp'))
const inventory=JSON.parse(await readFile(join(root,'inventory.json'),'utf8'))
const available=[]
for(const image of inventory.images){try{await access(join(root,'optimized',image.id+'.webp'));available.push(image)}catch{}}
const selected=available.sort((a,b)=>b.bytes-a.bytes).filter((image,index,list)=>list.findIndex(other=>other.producto_id===image.producto_id)===index).slice(0,4)
const overlays=[]
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
for(let row=0;row<selected.length;row++){
 const image=selected[row]
 for(let column=0;column<2;column++){
  const source=await readFile(join(root,column?'optimized':'originals',image.id+'.webp'))
  const picture=await sharp(source).resize({width:430,height:260,fit:'contain',background:'#ffffff'}).png().toBuffer()
  overlays.push({input:picture,left:column*480+25,top:row*320+35})
  const label=escape((column?'Optimizada':'Antes')+' - '+Math.round(source.length/1024)+' KB')
  const text=Buffer.from('<svg width="460" height="34"><text x="12" y="23" font-family="Arial" font-size="18" fill="#171717">'+label+'</text></svg>')
  overlays.push({input:text,left:column*480+10,top:row*320})
 }
 const title=Buffer.from('<svg width="930" height="24"><text x="12" y="17" font-family="Arial" font-size="14" fill="#444444">'+escape(image.nombre)+'</text></svg>')
 overlays.push({input:title,left:10,top:row*320+294})
}
await sharp({create:{width:960,height:selected.length*320,channels:3,background:'#ffffff'}}).composite(overlays).png().toFile(join(root,'comparacion.png'))
console.log(JSON.stringify({sampleImages:selected.length,path:join(root,'comparacion.png')}))
