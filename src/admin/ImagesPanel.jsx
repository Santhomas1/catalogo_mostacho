import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRemote } from '@/hooks/useRemote'
import RemoteState from '@/components/RemoteState'
import { optimizeImage, uploadProductImage, signedImageUrls, cleanImageQueue } from '@/services/images'
import { PRODUCT_THUMBNAILS } from '@/lib/image-settings'
import { Field } from './Fields'
import { useAdminAction } from './useAdminAction'
import AdminFeedback from './AdminFeedback'
import DeleteConfirm from './DeleteConfirm'

export default function ImagesPanel({ product, client, service, onChanged }) {
  const images = [...(product.imagenes_producto || [])].sort((a,b)=>a.orden-b.orden)
  const [file, setFile] = useState(null), [alt,setAlt] = useState(''), [deleting,setDeleting] = useState(null)
  const action = useAdminAction()
  const loader = useCallback(async () => {
    let urls
    try { urls = await signedImageUrls(client, product.imagenes_producto.map(image => image.storage_path)) }
    catch { urls = new Map() }
    return product.imagenes_producto.map(image => ({ ...image, src: urls.get(image.storage_path) || '/images/producto-sin-imagen.svg', failed: !urls.has(image.storage_path) }))
  }, [client, product])
  const { data, loading, error, retry } = useRemote(loader,45000)
  const photoUrls = new Map((data || []).map(image=>[image.id,image]))
  function move(index, delta) {
    const ids=images.map(image=>image.id); [ids[index],ids[index+delta]]=[ids[index+delta],ids[index]]
    action.run(async()=>{ await service.reorder(product.id,ids); onChanged('Orden de imágenes guardado. La primera es la portada.') })
  }
  return <section><h3>Imágenes</h3><p>Podés elegir imágenes de hasta 50 MB, incluidas fotos HEIC/HEIF de iPhone, JPEG, PNG, WebP, GIF, AVIF o BMP. Las convertimos automáticamente a WebP antes de subirlas; no necesitás reducirlas por tu cuenta. La primera foto es la portada y las imágenes de borradores son privadas.</p><form className="admin-editor" onSubmit={e=>{e.preventDefault();action.run(async()=>{
    if(!file) throw new Error('Elegí una imagen.')
    const blob=await optimizeImage(file)
    const thumbnailBlob=PRODUCT_THUMBNAILS ? await optimizeImage(blob,{maxDimension:640}) : undefined
    await uploadProductImage(client,{productId:product.id,blob,thumbnailBlob,alt,order:Math.max(-1,...images.map(image=>image.orden))+1})
    onChanged('Imagen cargada y guardada.')
  })}}><fieldset disabled={action.busy}><Field label="Archivo de imagen (incluye iPhone)" type="file" accept="image/*,.heic,.heif" required onChange={e=>setFile(e.target.files?.[0] || null)} /><Field label="Descripción de la imagen (texto alternativo)" required maxLength={500} value={alt} onChange={e=>setAlt(e.target.value)} /><Button type="submit">{action.busy?'Procesando…':'Cargar imagen'}</Button></fieldset></form><AdminFeedback action={action} /><RemoteState loading={loading} error={error} retry={retry} />{data?.some(image=>image.failed) && <p role="status">No se pudieron cargar algunas vistas previas. <button className="back-link" onClick={retry}>Reintentar</button></p>}<div className="admin-gallery">{images.map((image,index)=><article key={image.id}><img src={photoUrls.get(image.id)?.src || '/images/producto-sin-imagen.svg'} alt={image.texto_alternativo} width="240" height="240" onError={e=>{if(!e.currentTarget.src.endsWith('producto-sin-imagen.svg')) e.currentTarget.src='/images/producto-sin-imagen.svg'}} /><p>{index===0?'Portada':`Imagen ${index+1}`}</p><form onSubmit={e=>{e.preventDefault();const values=new FormData(e.currentTarget);action.run(async()=>{await service.save('imagenes_producto',{texto_alternativo:String(values.get('alt')).trim()},image);onChanged('Descripción de imagen guardada.')})}}><fieldset disabled={action.busy}><Field label="Texto alternativo" name="alt" defaultValue={image.texto_alternativo} required maxLength={500} /><Button variant="outline" type="submit">Guardar descripción</Button></fieldset></form><div className="hero-actions"><Button variant="outline" disabled={action.busy || index===0} onClick={()=>move(index,-1)} aria-label={`Mover imagen ${index+1} hacia arriba`}>Subir</Button><Button variant="outline" disabled={action.busy || index===images.length-1} onClick={()=>move(index,1)} aria-label={`Mover imagen ${index+1} hacia abajo`}>Bajar</Button><Button variant="ghost" disabled={action.busy} onClick={()=>setDeleting(image)}>Eliminar</Button></div></article>)}</div>{!images.length && <p>Todavía no hay fotos en esta ficha.</p>}{deleting && <DeleteConfirm title="¿Eliminar esta imagen y limpiar su archivo cuando ya no tenga referencias?" busy={action.busy} onCancel={()=>setDeleting(null)} onConfirm={()=>action.run(async()=>{
    await service.remove('imagenes_producto',deleting)
    let notice='Imagen eliminada de la galería.'
    try { const results=await cleanImageQueue(client,50,[deleting.storage_path, deleting.thumbnail_path].filter(Boolean),PRODUCT_THUMBNAILS); if(results.some(r=>r.error)) notice+=' Quedaron archivos pendientes de limpieza.' } catch { notice+=' La limpieza del archivo queda pendiente; reintentá desde Limpieza.' }
    onChanged(notice)
  })} />}</section>
}
