import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '@/components/CartProvider'
import { resolveCart } from '@/lib/cart'
import { prepareCartSummary } from '@/lib/cart-sync'
import { formatPrice, variantPriceLabel, productionLabel, isAgreedPrice, AGREED_PRICE_LABEL, pricingSummary } from '@/lib/pricing'
import { Button } from '@/components/ui/button'
import { business } from '@/lib/business'
import EmptyPage from '@/pages/EmptyPage'

export default function Cart() {
  const { items, products, cached, sync, refresh, update, remove, clear, warning } = useCart()
  const [confirmClear, setConfirmClear] = useState(false), [copied, setCopied] = useState('')
  const [prepared, setPrepared] = useState(null)
  const signature = JSON.stringify(items)
  useEffect(() => { setPrepared(null); setCopied('') }, [signature])
  useEffect(() => {
    if (!prepared) return
    const timer = setTimeout(() => { setPrepared(null); setCopied('La consulta venció. Actualizala antes de enviarla.') }, 30000)
    return () => clearTimeout(timer)
  }, [prepared])
  const fresh = prepared?.signature === signature && prepared?.checkedAt === sync.checkedAt && sync.status === 'ready'
  const summary = fresh ? prepared.text : ''
  const link = `${business.whatsapp}?text=${encodeURIComponent(summary)}`, long = link.length > 6000
  const lines = resolveCart(items, products)
  const pricing = pricingSummary(lines)
  // checkedAt lo fija la misma consulta de refresh; se conserva su identificador, no otro reloj.
  async function prepareLatest() {
    setPrepared(null); setCopied('')
    const snapshot = await refresh()
    if (!snapshot) return
    const text = prepareCartSummary(snapshot, window.location.origin)
    if (text) setPrepared({ text, signature: snapshot.signature, checkedAt: snapshot.checkedAt })
  }
  if (!items.length) return <><p className="container" role="status">{warning}</p><EmptyPage eyebrow="TU SELECCIÓN" title="Tu carrito está vacío." description="Elegí un producto, su variante y cantidad para preparar tu consulta." action="Comenzar a elegir" to="/catalogo" /></>
  return <section className="container catalog-page"><p className="eyebrow">TU SELECCIÓN</p><h1>Tu próxima idea, en lista.</h1>
    {warning && <p className="demo-notice" role="status">{warning}</p>}
    <div className="cart-sync" role={sync.status === 'error' ? 'alert' : 'status'}><p>{sync.message}</p>{sync.status === 'error' && <Button variant="outline" onClick={refresh}>Reintentar actualización</Button>}</div>
    <div className="cart-layout"><div>{lines.map(line => {
      const remembered = cached.find(p => p.variants.some(v => v.id === line.variantId))
      const title = line.product?.name || remembered?.name || 'Selección guardada'
      return <article className="cart-line" key={line.variantId}><div><h2>{line.product ? <Link to={`/productos/${line.product.slug}`}>{title}</Link> : title}</h2><p>{line.variant?.name || line.variantId}</p>{line.variant && <><p>SKU: {line.variant.sku}</p><p>{variantPriceLabel(line.variant)}</p><p>{productionLabel(line.variant)}</p></>}</div><div><label htmlFor={`qty-${line.variantId}`}>Cantidad</label><input id={`qty-${line.variantId}`} type="number" min="1" step="1" value={line.quantity} onChange={e => update(line.variantId, Number(e.target.value))} /><p>{sync.status === 'ready' && line.variant && !line.error ? (isAgreedPrice(line.variant) ? AGREED_PRICE_LABEL : formatPrice(line.subtotal, line.variant.currency)) : 'Pendiente de validar'}</p><Button variant="ghost" onClick={() => remove(line.variantId)}>Quitar</Button></div>{line.error && sync.status === 'ready' && <p className="cart-error" role="alert">{line.error}</p>}</article>
    })}<div className="hero-actions cart-actions"><Button asChild variant="outline"><Link to="/catalogo">Seguir eligiendo</Link></Button><Button variant="ghost" onClick={() => setConfirmClear(true)}>Vaciar carrito</Button></div>{confirmClear && <div className="demo-notice" role="group" aria-label="Confirmar vaciado"><p>¿Quitar todos los productos del carrito?</p><div className="hero-actions"><Button onClick={() => { clear(); setConfirmClear(false) }}>Sí, vaciar</Button><Button variant="outline" autoFocus onClick={() => setConfirmClear(false)}>Cancelar</Button></div></div>}</div>
    <aside className="cart-summary"><h2>Resumen de consulta</h2><p>{sync.status === 'ready' && lines.every(l => !l.error) ? pricing.label : 'Actualizá o revisá tu selección para conocer los importes vigentes.'}</p><p>Todos los productos se realizan por pedido. Los importes a acordar no se incluyen en el subtotal conocido. Precio final, tamaños y plazos se confirman con Mostacho.</p>
      <Button className="product-button" disabled={sync.status === 'checking'} onClick={prepareLatest}>{sync.status === 'checking' ? 'Actualizando…' : 'Actualizar y preparar consulta'}</Button>
      {fresh && <p role="status">Consulta actualizada. Revisá el resumen y envialo dentro de los próximos 30 segundos.</p>}
      {long && <p>El resumen es largo. Copialo y pegalo en WhatsApp.</p>}
      {summary && !long ? <Button asChild className="product-button"><a href={link} target="_blank" rel="noreferrer">Enviar carrito por WhatsApp</a></Button> : <Button disabled className="product-button">Enviar carrito por WhatsApp</Button>}
      <Button variant="outline" className="product-button" disabled={!summary} onClick={async () => { try { await navigator.clipboard.writeText(summary); setCopied('Resumen copiado.') } catch { setCopied('Seleccioná y copiá el resumen de abajo; no se pudo copiar automáticamente.') } }}>Copiar resumen</Button>
      {summary && long && <a className="back-link" href={business.whatsapp} target="_blank" rel="noreferrer">Abrir WhatsApp</a>}
      <p role="status">{copied}</p>{summary && <details><summary>Ver y copiar el mensaje</summary><textarea className="summary-text" readOnly value={summary} aria-label="Mensaje completo para copiar" onFocus={e => e.target.select()} /></details>}
      <p className="product-availability">Abrir WhatsApp no borra el carrito ni confirma el envío.</p>
    </aside></div>
  </section>
}
