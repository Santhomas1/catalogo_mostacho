import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRemote } from '@/hooks/useRemote'
import RemoteState from '@/components/RemoteState'
import { Field, Check } from './Fields'
import { slugify } from './admin-service'
import { useAdminAction } from './useAdminAction'
import AdminFeedback from './AdminFeedback'
import DeleteConfirm from './DeleteConfirm'

const names = { categorias: 'Categorías', materiales: 'Materiales', colores: 'Colores' }
export default function RegistryPanel({ table, service }) {
  const [page, setPage] = useState(1), [query, setQuery] = useState(''), [editing, setEditing] = useState(null), [message, setMessage] = useState('')
  const loader = useCallback(() => service.list(table, { page, query }), [service, table, page, query])
  const { data, loading, error, retry } = useRemote(loader)
  return <section><div className="admin-toolbar"><h2>{names[table]}</h2><Button onClick={() => { setEditing({}); setMessage('') }}>Agregar</Button></div><Field label="Buscar por nombre" type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} />{message && <p role="status" className="admin-notice">{message}</p>}{editing && <RegistryEditor key={editing.id || 'new'} table={table} record={editing} service={service} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); setMessage('Cambios guardados.'); retry() }} />}<RemoteState loading={loading} error={error} retry={retry} />{data && <><div className="admin-list">{data.rows.map(row => <article key={row.id}><div><strong>{row.nombre}</strong><p>{(row.activa ?? row.activo) ? 'Activo' : 'Desactivado'}{row.slug ? ` · ${row.slug}` : ''}{row.codigo_hex ? ` · ${row.codigo_hex}` : ''}</p></div><Button variant="outline" onClick={() => { setEditing(row); setMessage('') }}>Editar</Button></article>)}</div>{!data.rows.length && <p>No hay registros con esa búsqueda.</p>}<div className="pagination"><Button variant="outline" disabled={data.page === 1} onClick={() => setPage(data.page - 1)}>Anterior</Button><span>Página {data.page}</span><Button variant="outline" disabled={data.page * 20 >= data.count} onClick={() => setPage(data.page + 1)}>Siguiente</Button></div></>}</section>
}
function RegistryEditor({ table, record, service, onCancel, onSaved }) {
  const [form, setForm] = useState({ id: record.id || crypto.randomUUID(), nombre: '', slug: '', descripcion: '', codigo_hex: '', orden: 0, activa: true, activo: true, ...record })
  const [deleting, setDeleting] = useState(false)
  const action = useAdminAction()
  const change = (field, value) => setForm(old => ({ ...old, [field]: value }))
  return <section className="admin-editor"><h3>{record.id ? 'Editar' : 'Agregar'} {names[table].toLowerCase()}</h3><form onSubmit={e => { e.preventDefault(); action.run(async () => {
    const values = { ...form, nombre: form.nombre.trim(), descripcion: form.descripcion?.trim() || null, codigo_hex: form.codigo_hex?.trim() || null, orden: Number(form.orden) }
    await service.save(table, values, record.id ? record : null); onSaved()
  }) }}><fieldset disabled={action.busy}><Field label="Nombre" required maxLength={120} value={form.nombre} onChange={e => { const value = e.target.value; setForm(old => ({ ...old, nombre: value, ...(!record.id && old.slug === slugify(old.nombre) ? { slug: slugify(value) } : {}) })) }} />{table === 'categorias' && <><Field label="Dirección corta (slug)" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={e => change('slug', e.target.value)} /><Field label="Orden" type="number" min="0" step="1" required value={form.orden} onChange={e => change('orden', e.target.value)} /></>}{table !== 'colores' && <Field label="Descripción" multiline value={form.descripcion || ''} onChange={e => change('descripcion', e.target.value)} />}{table === 'colores' && <Field label="Color hexadecimal (opcional, por ejemplo #BCE8F7)" pattern="#[0-9A-Fa-f]{6}" value={form.codigo_hex || ''} onChange={e => change('codigo_hex', e.target.value)} />}<Check label="Activo" checked={table === 'categorias' ? form.activa : form.activo} onChange={e => change(table === 'categorias' ? 'activa' : 'activo', e.target.checked)} /><div className="hero-actions"><Button type="submit">{action.busy ? 'Guardando…' : 'Guardar'}</Button><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button></div></fieldset></form><AdminFeedback action={action} />{record.id && <><Button variant="ghost" disabled={action.busy} onClick={() => setDeleting(true)}>Eliminar definitivamente</Button>{deleting && <DeleteConfirm title={`¿Eliminar «${record.nombre}»?`} busy={action.busy} onCancel={() => setDeleting(false)} onConfirm={() => action.run(async () => { await service.remove(table, record); onSaved() })} />}</>}</section>
}
