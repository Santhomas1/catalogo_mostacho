import { existsSync } from 'node:fs'
if (existsSync('.image-backfill.local/applied.json')) throw new Error('This image batch is already applied. Use its saved manifest for verification or rollback.')
// Read-only remote phase: download originals and prepare reversible local replacements.
// Temporary dependencies: sharp + ssim.js under IMAGE_TOOLS or .image-backfill.local/tools.
import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
const require = createRequire(import.meta.url)
const tools = resolve(process.env.IMAGE_TOOLS || '.image-backfill.local/tools')
const sharp = require(join(tools, 'node_modules/sharp'))
const { ssim } = require(join(tools, 'node_modules/ssim.js'))
const root = resolve('.image-backfill.local')
const inventory = JSON.parse(await readFile(join(root, 'inventory.json'), 'utf8'))
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
for (const image of inventory.images) {
 if (!uuid.test(image.id) || !uuid.test(image.producto_id) || !new RegExp('^products/' + image.producto_id + '/[a-f0-9-]{36}\\.webp$').test(image.storage_path)) throw Error('Invalid inventory path')
}
for (const directory of ['originals', 'optimized', 'thumbnails']) await mkdir(join(root,directory),{recursive:true})
const client = createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const hash = data => createHash('sha256').update(data).digest('hex')
try {
 for(let start=0;start<inventory.images.length;start+=40) {
  const batch=inventory.images.slice(start,start+40)
  const missing=[]
  for(const image of batch) {
   try { const existing=await readFile(join(root,'originals',image.id+'.webp')); if(existing.length!==image.bytes)throw Error('Original changed'); }
   catch { missing.push(image) }
  }
  if(missing.length) {
   const {data,error}=await client.storage.from('productos').createSignedUrls(missing.map(image=>image.storage_path),60)
   if(error)throw error
   const urls=new Map(data.map(image=>[image.path,image.signedUrl]))
   for(let offset=0;offset<missing.length;offset+=4) await Promise.all(missing.slice(offset,offset+4).map(async image=>{
    const url=urls.get(image.storage_path)
    if(!url || new URL(url).origin!==new URL(process.env.VITE_SUPABASE_URL).origin)throw Error('Could not sign referenced image '+image.id)
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)})
    if(!response.ok)throw Error('Download failed '+image.id)
    const bytes=Buffer.from(await response.arrayBuffer())
    if(bytes.length!==image.bytes)throw Error('Concurrent image change '+image.id)
    await writeFile(join(root,'originals',image.id+'.webp'),bytes)
   }))
  }
  console.log(JSON.stringify({downloaded:Math.min(start+40,inventory.images.length),total:inventory.images.length}))
 }
 const imageData=async(buffer,width)=>{
  const {data,info}=await sharp(buffer).rotate().resize({width,height:width,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  return {data,width:info.width,height:info.height}
 }
 const records=[]
 for(const image of inventory.images) {
  const original=await readFile(join(root,'originals',image.id+'.webp'))
  const metadata=await sharp(original).metadata()
  const reference=await imageData(original,800)
  let best={buffer:original,quality:null,similarity:1,changed:false}
  if(original.length>120*1024) {
   for(const quality of [82,78,74]) {
    const candidate=await sharp(original).rotate().webp({quality,effort:5,smartSubsample:true,alphaQuality:100}).toBuffer()
    const similarity=ssim(reference,await imageData(candidate,800)).mssim
    if(similarity>=0.985 && candidate.length<original.length*0.9 && candidate.length<best.buffer.length)best={buffer:candidate,quality,similarity,changed:true}
    if(best.changed && best.buffer.length<=120*1024)break
   }
  }
  const thumbReference=await imageData(original,640)
  let thumbnail=null
  for(const quality of [82,78,74]) {
   const candidate=await sharp(original).rotate().resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).webp({quality,effort:5,smartSubsample:true,alphaQuality:100}).toBuffer()
   const similarity=ssim(thumbReference,await imageData(candidate,640)).mssim
   if(similarity>=0.985 && (!thumbnail || candidate.length<thumbnail.buffer.length))thumbnail={buffer:candidate,quality,similarity}
   if(thumbnail && thumbnail.buffer.length<=40*1024)break
  }
  if(!thumbnail) {
   const buffer=await sharp(original).rotate().resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).webp({lossless:true,effort:5}).toBuffer()
   thumbnail={buffer,quality:100,similarity:ssim(thumbReference,await imageData(buffer,640)).mssim}
  }
  const thumbMeta=await sharp(thumbnail.buffer).metadata(), mainMeta=await sharp(best.buffer).metadata()
  if(mainMeta.width!==metadata.width || mainMeta.height!==metadata.height || thumbMeta.width>640 || thumbMeta.height>640 || thumbnail.similarity<0.985)throw Error('Image verification failed '+image.id)
  if(best.changed)await writeFile(join(root,'optimized',image.id+'.webp'),best.buffer)
  await writeFile(join(root,'thumbnails',image.id+'.webp'),thumbnail.buffer)
  records.push({...image,originalSha256:hash(original),width:metadata.width,height:metadata.height,newPath:best.changed?'products/'+image.producto_id+'/'+randomUUID()+'.webp':image.storage_path,newBytes:best.buffer.length,newSha256:hash(best.buffer),quality:best.quality,similarity:best.similarity,changed:best.changed,thumbnailPath:'products/'+image.producto_id+'/'+randomUUID()+'.webp',thumbnailBytes:thumbnail.buffer.length,thumbnailSha256:hash(thumbnail.buffer),thumbnailQuality:thumbnail.quality,thumbnailSimilarity:thumbnail.similarity})
  if(records.length%10===0)console.log(JSON.stringify({processed:records.length,total:inventory.images.length}))
 }
 const summary={images:records.length,recompressed:records.filter(image=>image.changed).length,originalBytes:records.reduce((s,i)=>s+i.bytes,0),optimizedBytes:records.reduce((s,i)=>s+i.newBytes,0),thumbnailBytes:records.reduce((s,i)=>s+i.thumbnailBytes,0),minSimilarity:Math.min(...records.map(i=>i.similarity)),minThumbnailSimilarity:Math.min(...records.map(i=>i.thumbnailSimilarity))}
 await writeFile(join(root,'plan.json'),JSON.stringify({preparedAt:new Date().toISOString(),policy:{mainResolution:'unchanged',thumbnailMaxEdge:640,minSsimAtDisplaySize:0.985,minSavingsForRecompression:0.1,mainTargetBytes:122880,thumbnailTargetBytes:40960},summary,images:records},null,2))
 console.log(JSON.stringify(summary))
} finally {await client.auth.dispose()}
