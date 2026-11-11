import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { catalogService } from '@/services/catalog'
import { useRemote } from '@/hooks/useRemote'
import RemoteState from '@/components/RemoteState'
import { ProductVisual, ProductPhoto } from '@/components/ProductCard'
import { useCart } from '@/components/CartProvider'
import { Button } from '@/components/ui/button'
import EmptyPage from '@/pages/EmptyPage'
import { variantPriceLabel, productionLabel, AGREED_PRICE_LABEL, isAgreedPrice, hasFixedProductPrice } from '@/lib/pricing'
import PageMetadata from '@/components/PageMetadata'
import { productMetadata } from '@/lib/metadata'
import { business } from '@/lib/business'
import { variantLabel } from '@/lib/variants'
export default function Product() {
  const { slug } = useParams()
  const loader = useCallback(() => catalogService().bySlug(slug), [slug])
  const { data, loading, error, retry } = useRemote(loader, 45000)
  if (loading || error) return <section className="container catalog-page"><RemoteState loading={loading} error={error} retry={retry} /></section>
  const product = data?.product
  if (!product) return <><PageMetadata metadata={{title: 'Producto no disponible · Mostacho 3D', description: 'Este producto no está disponible en el catálogo.', noIndex: true}} /><EmptyPage eyebrow="PRODUCTO NO DISPONIBLE" title="Este producto no está disponible." description="Podés seguir recorriendo el catálogo." action="Ir al catálogo" to="/catalogo" /></>
  return <><PageMetadata metadata={productMetadata(product)} />{data.imageWarning && <p className="container" role="status">Algunas fotos no se pudieron cargar. <button className="back-link" onClick={retry}>Reintentar</button></p>}<ProductDetail key={product.id} product={product} /></>
}
function ProductDetail({ product }) {
  const variants = product.variants.filter(v => v.active)
  const [selectedId, setSelected] = useState(variants[0]?.id || '')
  const [quantity, setQuantity] = useState('1'), [notice, setNotice] = useState('')
  const [photo, setPhoto] = useState(0), [failed, setFailed] = useState(false)
  const { add, addProduct } = useCart()
  const selected = variants.some(v => v.id === selectedId) ? selectedId : (variants[0]?.id || '')
  const variant = variants.find(v => v.id === selected), amount = Number(quantity)
  const displayedPrice = variant || (!product.variants.length && hasFixedProductPrice(product) ? product : null)
  const priceToAgree = !displayedPrice || isAgreedPrice(displayedPrice)
  const valid = variant && variant.availability !== 'no_disponible' && Number.isSafeInteger(amount) && amount > 0
  const images = product.images || []
  const imageIndex = Math.min(photo, Math.max(0, images.length - 1))
  const root = useRef(null)
  useEffect(() => { setFailed(false) }, [images[imageIndex]?.url])
  useEffect(() => {
    if (!root.current || typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.removeAttribute('data-reveal-pending'); observer.unobserve(entry.target) }
    }), { threshold: 0.05 })
    const nodes = root.current.querySelectorAll('[data-detail-reveal]')
    nodes.forEach(node => { node.setAttribute('data-reveal-pending', ''); observer.observe(node) })
    return () => { observer.disconnect(); nodes.forEach(node => node.removeAttribute('data-reveal-pending')) }
  }, [])
  function showPhoto(index) { setPhoto(index); setFailed(false) }
  return <section className="container product-page" ref={root}>
    <nav className="detail-breadcrumb" aria-label="Ruta del producto"><Link to="/catalogo">Volver al catálogo</Link><span aria-hidden="true">/</span><Link to={`/catalogo?categoria=${encodeURIComponent(product.categorySlug)}`}>{product.category}</Link></nav>
    {product.demo && <p className="demo-notice">Producto ficticio de prueba. No está a la venta.</p>}
    <div className="product-detail">
      <section className="detail-gallery" aria-label="Fotos del producto" data-detail-reveal>
        <div className="detail-image-stage">{images.length && !failed
          ? <ProductPhoto image={images[imageIndex]} className="product-photo" fetchPriority="high" alt={images[imageIndex].alt} width="800" height="800" decoding="async" onError={() => setFailed(true)} />
          : <ProductVisual />}</div>
        {images.length > 0 && <div className="detail-gallery-nav"><p aria-live="polite" aria-atomic="true">Imagen {imageIndex + 1} de {images.length}</p>{images.length > 1 && <div><button type="button" disabled={imageIndex === 0} aria-label="Imagen anterior" onClick={() => showPhoto(imageIndex - 1)}>Anterior</button><button type="button" disabled={imageIndex === images.length - 1} aria-label="Imagen siguiente" onClick={() => showPhoto(imageIndex + 1)}>Siguiente</button></div>}</div>}
        {images.length > 1 && <div className="gallery-thumbnails" role="group" aria-label="Elegir foto">{images.map((image, i) => <button type="button" key={image.id || image.path || i} aria-label={`Ver imagen ${i + 1}`} aria-pressed={imageIndex === i} onClick={() => showPhoto(i)}><ProductPhoto image={image} thumbnail alt="" loading="lazy" onError={e => { if (!e.currentTarget.src.endsWith('/images/producto-sin-imagen.svg')) e.currentTarget.src = '/images/producto-sin-imagen.svg' }} /></button>)}</div>}
      </section>
      <div className="detail-info" data-detail-reveal>
        <header className="detail-heading"><div className="detail-meta"><p>{product.category}</p><span>{variant?.availability === 'no_disponible' ? 'No disponible' : 'Por pedido'}</span></div><h1>{product.name}</h1></header>
        {variant && <div className="detail-order">
          <label className="detail-label" htmlFor="variant">Material, color y tamaño</label>
          <select id="variant" value={selected} onChange={e => { setSelected(e.target.value); setQuantity('1'); setNotice('') }}>{variants.map(v => <option key={v.id} value={v.id} disabled={v.availability === 'no_disponible'}>{variantLabel(v)}{v.availability === 'no_disponible' ? ' · No disponible' : ''}</option>)}</select>
          <dl className="detail-specs"><div><dt>Material</dt><dd>{variant.material}</dd></div><div><dt>Color</dt><dd>{variant.color}</dd></div><div><dt>Medidas</dt><dd>{variant.dimensions}</dd></div></dl>
        </div>}
        <div className="detail-price-block" aria-live="polite"><p className="detail-label">{priceToAgree ? 'Precio a consultar' : 'Precio por unidad'}</p><p className={`detail-price${priceToAgree ? ' detail-price-quote' : ''}`}>{displayedPrice ? variantPriceLabel(displayedPrice) : AGREED_PRICE_LABEL}</p><p className="detail-price-hint">{variant ? productionLabel(variant) : 'Tamaños, materiales y plazo a coordinar.'}</p></div>
        {variant ? <div className="detail-order">
          <div className="detail-purchase-row"><div><label className="detail-label" htmlFor="quantity">Cantidad</label><div className="detail-quantity"><button type="button" aria-label="Reducir cantidad" disabled={!Number.isSafeInteger(amount) || amount <= 1} onClick={() => setQuantity(String(amount - 1))}>−</button><input id="quantity" aria-invalid={!Number.isSafeInteger(amount) || amount < 1} aria-describedby={!valid ? "detail-quantity-help" : undefined} type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} /><button type="button" aria-label="Aumentar cantidad" disabled={!Number.isSafeInteger(amount) || amount < 1 || amount >= Number.MAX_SAFE_INTEGER} onClick={() => setQuantity(String(amount + 1))}>+</button></div></div><Button className="detail-primary" disabled={!valid} onClick={() => { add(variant.id, amount, product); setNotice('Agregado al carrito. Podés seguir eligiendo.') }}>Agregar al carrito</Button></div>
          {!valid && <p id="detail-quantity-help" className="detail-feedback" role="status">Ingresá una cantidad entera positiva para una opción disponible.</p>}
          <p className="detail-feedback" role="status">{notice}</p><Link className="detail-secondary-link" to="/carrito">Ver carrito</Link>
        </div> : <div className="detail-inquiry"><p>Consultá las opciones de este producto y coordinamos los detalles con vos.</p><div className="detail-inquiry-actions"><Button asChild className="detail-primary"><a href={`${business.whatsapp}?text=${encodeURIComponent(`estoy interesado en este producto ("${product.name}")`)}`} target="_blank" rel="noreferrer">Consultar este producto</a></Button>{!product.hasVariants && !product.demo && <Button className="detail-add-product" variant="outline" onClick={() => { addProduct(product); setNotice('Agregado al carrito. Podés seguir eligiendo.') }}>Agregar al carrito</Button>}</div><p className="detail-feedback" role="status">{notice}</p>{notice && <Link className="detail-secondary-link" to="/carrito">Ver carrito</Link>}</div>}
        <p className="detail-order-note">Hecho por pedido. Confirmamos el precio final y la fecha antes de producir.</p>
        <div className="detail-details">
          {product.description?.trim() && <details open><summary>Sobre este producto</summary><p>{product.description}</p></details>}
          {product.care?.trim() && <details><summary>Cuidados</summary><p>{product.care}</p></details>}
          <details><summary>Retiro y coordinación</summary><p>Retiro coordinado en San Miguel de Tucumán. Consultanos para acordar la fecha y los detalles de tu pedido.</p></details>
        </div>
      </div>
    </div>
  </section>
}
