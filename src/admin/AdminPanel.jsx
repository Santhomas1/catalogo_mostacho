import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useRemote } from '@/hooks/useRemote'
import RemoteState from '@/components/RemoteState'
import { Field } from './Fields'
import { useAdminAction } from './useAdminAction'
import AdminFeedback from './AdminFeedback'
import DeleteConfirm from './DeleteConfirm'
import RegistryPanel from './RegistryPanel'
import ProductWorkspace from './ProductWorkspace'
import { cleanImageQueue } from '@/services/images'

export default function AdminPanel({ client, service }) {
  const [tab,setTab]=useState('productos')
  return <><nav className="admin-tabs" aria-label="Secciones de administración">{[['productos','Productos'],['categorias','Categorías'],['materiales','Materiales'],['colores','Colores'],['limpieza','Limpieza de archivos']].map(([value,label])=><Button key={value} variant={tab===value?'default':'outline'} aria-pressed={tab===value} onClick={()=>setTab(value)}>{label}</Button>)}</nav><p className="admin-hint">Guardá el formulario actual antes de cambiar de sección.</p>{tab==='productos'?<ProductSection client={client} service={service}/>:tab==='limpieza'?<CleanupPanel client={client}/>:<RegistryPanel key={tab} table={tab} service={service}/>}</>
}
function ProductSection({client,service}) {
  const [selected,setSelected]=useState(null),[message,setMessage]=useState('')
  return selected?<ProductWorkspace key={selected} id={selected} initialMessage={message} client={client} service={service} onCreated={value=>{setMessage('Borrador creado. Ahora podés agregar variantes e imágenes.');setSelected(value)}} onClose={notice=>{setSelected(null);setMessage(notice || '')}}/>:<ProductList service={service} message={message} onSelect={value=>{setMessage('');setSelected(value)}}/>
}
function ProductList({service,onSelect,message}) {
  const [page,setPage]=useState(1),[query,setQuery]=useState('')
  const loader=useCallback(()=>service.list('productos',{page,query}),[service,page,query])
  const {data,loading,error,retry}=useRemote(loader)
  return <section><div className="admin-toolbar"><h2>Productos</h2><Button onClick={()=>onSelect('new')}>Nuevo producto</Button></div>{message && <p className="admin-notice" role="status">{message}</p>}<Field label="Buscar productos por nombre" type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/><RemoteState loading={loading} error={error} retry={retry}/>{data && <><div className="admin-list">{data.rows.map(product=><article key={product.id}><div><strong>{product.nombre}</strong><p>{product.publicado?'Publicado':'Borrador'}{product.destacado?' · Destacado':''}{product.es_ejemplo?' · Ejemplo privado':''}</p></div><div className="hero-actions"><Button variant="outline" onClick={()=>onSelect(product.id)}>Editar</Button>{product.publicado && !product.es_ejemplo && <Button variant="ghost" asChild><Link target="_blank" rel="noreferrer" to={`/productos/${product.slug}`}>Ver ficha pública</Link></Button>}</div></article>)}</div>{!data.rows.length && <p>No hay productos con esa búsqueda. Podés crear un borrador.</p>}<div className="pagination"><Button variant="outline" disabled={data.page===1} onClick={()=>setPage(data.page-1)}>Anterior</Button><span>Página {data.page}</span><Button variant="outline" disabled={data.page*20>=data.count} onClick={()=>setPage(data.page+1)}>Siguiente</Button></div></>}</section>
}
function CleanupPanel({client}) {
  const [confirm,setConfirm]=useState(false)
  const action=useAdminAction()
  const loader=useCallback(async()=>{const {data,error}=await client.from('archivos_pendientes_limpieza').select('*',{count:'exact'}).order('creado_en').limit(50);if(error)throw error;return data},[client])
  const {data,loading,error,retry}=useRemote(loader)
  return <section><h2>Limpieza de archivos</h2><p>Estos archivos fueron desvinculados o quedaron pendientes al fallar una carga. La limpieza vuelve a verificar que no tengan referencias antes de eliminarlos.</p><RemoteState loading={loading} error={error} retry={retry}/><AdminFeedback action={action}/>{data && <><p>{data.length} pendientes en este lote (hasta 50).</p><Button variant="outline" disabled={action.busy || !data.length} onClick={()=>setConfirm(true)}>Limpiar este lote</Button><div className="admin-list">{data.map(row=><article key={row.id}><div><strong className="admin-path">{row.storage_path}</strong><p>{row.motivo}</p></div></article>)}</div></>}{confirm && <DeleteConfirm title="¿Eliminar definitivamente hasta 50 archivos sin referencia?" busy={action.busy} onCancel={()=>setConfirm(false)} onConfirm={()=>action.run(async()=>{const results=await cleanImageQueue(client);setConfirm(false);retry();if(results.some(r=>r.error))throw new Error('Algunos archivos siguen pendientes. Se conservaron para reintentar.');if(results.some(r=>r.skipped))throw new Error('Se omitieron archivos que tienen referencias. No se borraron.');},'Lote de limpieza completado.')} />}</section>
}
