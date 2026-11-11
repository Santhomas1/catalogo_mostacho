// Read-only verification of every active photo/thumbnail against the prepared hashes.
import{createClient}from'@supabase/supabase-js'
import{readFile,writeFile}from'node:fs/promises'
import{createHash}from'node:crypto'
const plan=JSON.parse(await readFile('.image-backfill.local/plan.json','utf8'))
const expected=plan.images.flatMap(i=>[{path:i.newPath,bytes:i.newBytes,sha256:i.newSha256},{path:i.thumbnailPath,bytes:i.thumbnailBytes,sha256:i.thumbnailSha256}])
const client=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
let verified=0
try{
 for(let start=0;start<expected.length;start+=30){
  const batch=expected.slice(start,start+30)
  const{data,error}=await client.storage.from('productos').createSignedUrls(batch.map(i=>i.path),60)
  if(error)throw error
  const urls=new Map(data.map(i=>[i.path,i.signedUrl]))
  for(let offset=0;offset<batch.length;offset+=4)await Promise.all(batch.slice(offset,offset+4).map(async image=>{
   const url=urls.get(image.path)
   if(!url||new URL(url).origin!==new URL(process.env.VITE_SUPABASE_URL).origin)throw Error('Signing denied '+image.path)
   const response=await fetch(url,{signal:AbortSignal.timeout(30000)})
   if(!response.ok)throw Error('Download failed '+image.path)
   const bytes=Buffer.from(await response.arrayBuffer())
   if(bytes.length!==image.bytes||createHash('sha256').update(bytes).digest('hex')!==image.sha256)throw Error('Remote image differs '+image.path)
   verified++
  }))
 }
 const changed=plan.images.find(i=>i.changed)
 const old=await client.storage.from('productos').createSignedUrl(changed.storage_path,60)
 if(!old.error)throw Error('Unreferenced original must not be anonymously signable')
 const result={verified,expected:expected.length,allHashesMatch:true,unreferencedOriginalPrivate:true,verifiedAt:new Date().toISOString()}
 await writeFile('.image-backfill.local/verification.json',JSON.stringify(result,null,2))
 console.log(JSON.stringify(result))
}finally{await client.auth.dispose()}
