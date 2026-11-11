import { existsSync } from 'node:fs'
if (existsSync('.image-backfill.local/applied.json')) throw new Error('This image batch is already applied. Use its saved manifest for verification or rollback.')
// Refine large photos at 1280 px and avoid unnecessarily large lossless thumbnails.
// Reads only local originals; never recompresses an already recompressed candidate.
import{readFile,writeFile}from'node:fs/promises'
import{createRequire}from'node:module'
import{resolve,join}from'node:path'
import{createHash,randomUUID}from'node:crypto'
const require=createRequire(import.meta.url),root=resolve('.image-backfill.local'),sharp=require(join(root,'tools/node_modules/sharp')),{ssim}=require(join(root,'tools/node_modules/ssim.js'))
const plan=JSON.parse(await readFile(join(root,'plan.json'),'utf8'))
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const raw=async(buffer,edge)=>{const{data,info}=await sharp(buffer).rotate().resize({width:edge,height:edge,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});return{data,width:info.width,height:info.height}}
let resized=0,thumbnailsImproved=0
for(const image of plan.images){
 const source=await readFile(join(root,'originals',image.id+'.webp'))
 if(hash(source)!==image.originalSha256)throw Error('Original changed')
 if(image.newBytes>200*1024&&Math.max(image.width,image.height)>1280){
  const reference=await raw(source,800)
  for(const quality of [78,82]){
   const candidate=await sharp(source).rotate().resize({width:1280,height:1280,fit:'inside',withoutEnlargement:true}).webp({quality,effort:5,smartSubsample:true,alphaQuality:100}).toBuffer()
   const pixels=await raw(candidate,800)
   if(pixels.width!==reference.width||pixels.height!==reference.height)continue
   const similarity=ssim(reference,pixels).mssim
   if(similarity>=0.985&&candidate.length<image.newBytes*0.85){
    await writeFile(join(root,'optimized',image.id+'.webp'),candidate)
    const meta=await sharp(candidate).metadata()
    if(!image.changed)image.newPath='products/'+image.producto_id+'/'+randomUUID()+'.webp'
    Object.assign(image,{changed:true,resized:true,newWidth:meta.width,newHeight:meta.height,newBytes:candidate.length,newSha256:hash(candidate),quality,similarity})
    resized++;break
   }
  }
 }
 if(image.thumbnailQuality===100){
  const reference=await raw(source,640)
  for(const quality of [88,92,96]){
   const candidate=await sharp(source).rotate().resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).webp({quality,effort:5,smartSubsample:true,alphaQuality:100}).toBuffer()
   const similarity=ssim(reference,await raw(candidate,640)).mssim
   if(similarity>=0.985&&candidate.length<image.thumbnailBytes){
    await writeFile(join(root,'thumbnails',image.id+'.webp'),candidate)
    Object.assign(image,{thumbnailBytes:candidate.length,thumbnailSha256:hash(candidate),thumbnailQuality:quality,thumbnailSimilarity:similarity})
    thumbnailsImproved++;break
   }
  }
 }
}
plan.policy.mainResolution='preserved; selected large images reduced to 1280 px after SSIM verification at 800 px'
plan.summary={images:plan.images.length,recompressed:plan.images.filter(i=>i.changed).length,resized:plan.images.filter(i=>i.resized).length,originalBytes:plan.images.reduce((s,i)=>s+i.bytes,0),optimizedBytes:plan.images.reduce((s,i)=>s+i.newBytes,0),thumbnailBytes:plan.images.reduce((s,i)=>s+i.thumbnailBytes,0),minSimilarity:Math.min(...plan.images.map(i=>i.similarity)),minThumbnailSimilarity:Math.min(...plan.images.map(i=>i.thumbnailSimilarity))}
await writeFile(join(root,'plan.json'),JSON.stringify(plan,null,2))
console.log(JSON.stringify({...plan.summary,resizedThisRun:resized,thumbnailsImproved}))
