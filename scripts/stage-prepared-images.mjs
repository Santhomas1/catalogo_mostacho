// Creates an upload-only tree. No remote writes, deletions, or credential access.
import { readFile,writeFile,mkdir,copyFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve,join,sep } from 'node:path'
const root=resolve('.image-backfill.local')
const plan=JSON.parse(await readFile(join(root,'plan.json'),'utf8'))
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
const entries=[]
for(const image of plan.images) {
 if(!uuid.test(image.id)||!uuid.test(image.producto_id))throw Error('Invalid image identity')
 const candidates=[...(image.changed?[{path:image.newPath,directory:'optimized',sha256:image.newSha256,bytes:image.newBytes}]:[]),{path:image.thumbnailPath,directory:'thumbnails',sha256:image.thumbnailSha256,bytes:image.thumbnailBytes}]
 for(const entry of candidates) {
  if(!new RegExp('^products/'+image.producto_id+'/[a-f0-9-]{36}\\.webp$').test(entry.path)||entry.path===image.storage_path)throw Error('Unsafe replacement path')
  const source=join(root,entry.directory,image.id+'.webp')
  const bytes=await readFile(source)
  if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Prepared image changed')
  const destination=resolve(root,'uploads',entry.path)
  if(!destination.startsWith(join(root,'uploads')+sep))throw Error('Unsafe upload tree')
  await mkdir(resolve(destination,'..'),{recursive:true})
  await copyFile(source,destination)
  entries.push({path:entry.path,bytes:entry.bytes,sha256:entry.sha256})
 }
}
await writeFile(join(root,'upload-manifest.json'),JSON.stringify({projectRef:'dthsrdgvrkoxxqwotedd',bucket:'productos',entries},null,2))
console.log(JSON.stringify({files:entries.length,bytes:entries.reduce((s,e)=>s+e.bytes,0),originalsExcluded:true}))
