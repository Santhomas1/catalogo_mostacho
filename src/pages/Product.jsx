import { useState, useCallback, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { catalogService } from '@/services/catalog'
import { useRemote } from '@/hooks/useRemote'
import RemoteState from '@/components/RemoteState'
import { ProductVisual } from '@/components/ProductCard'
import { useCart } from '@/components/CartProvider'
import { Button } from '@/components/ui/button'
import EmptyPage from '@/pages/EmptyPage'
import { variantPriceLabel, productionLabel } from '@/lib/pricing'
import PageMetadata from '@/components/PageMetadata'
import { productMetadata } from '@/lib/metadata'
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
  const { add } = useCart()
  const selected = variants.some(v => v.id === selectedId) ? selectedId : (variants[0]?.id || '')
  const variant = variants.find(v => v.id === selected), amount = Number(quantity)
  const valid = variant && variant.availability !== 'no_disponible' && Number.isSafeInteger(amount) && amount > 0
  const images = product.images || []
  const imageIndex = Math.min(photo, Math.max(0, images.length - 1))
  useEffect(() => { setFailed(false) }, [images[imageIndex]?.url])
  return <section className="container catalog-page"><Link className="back-link" to="/catalogo">← Volver al catálogo</Link>{product.demo && <p className="demo-notice">Producto ficticio de prueba. No está a la venta.</p>}<div className="product-detail"><div>{images.length ? <>{failed ? <ProductVisual /> : <img className="product-photo" src={images[imageIndex].url} alt={images[imageIndex].alt} onError={() => setFailed(true)} />}<div className="gallery-thumbnails">{images.map((image, i) => <button key={image.url} aria-label={`Ver imagen ${i + 1}`} aria-pressed={photo === i} onClick={() => { setPhoto(i); setFailed(false) }}><img src={image.url} alt={image.alt} /></button>)}</div></> : <ProductVisual />}</div><div><p className="eyebrow">{product.category}</p><h1>{product.name}</h1><p>{product.description}</p>{variant ? <><label className="variant-label" htmlFor="variant">Material, color y tamaño</label><select id="variant" value={selected} onChange={e => { setSelected(e.target.value); setQuantity('1'); setNotice('') }}>{variants.map(v => <option key={v.id} value={v.id} disabled={v.availability === 'no_disponible'}>{v.name}{v.availability === 'no_disponible' ? ' · No disponible' : ''}</option>)}</select><div aria-live="polite" className="variant-summary"><p className="product-price">{variantPriceLabel(variant)}</p><p>Medidas: {variant.dimensions}</p><p>{productionLabel(variant)}</p></div><label className="variant-label" htmlFor="quantity">Cantidad</label><input id="quantity" type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} />{!valid && <p role="status">Ingresá una cantidad entera positiva para una opción disponible.</p>}<div className="hero-actions cart-actions"><Button disabled={!valid} onClick={() => { add(variant.id, amount, product); setNotice('Agregado al carrito. Podés seguir eligiendo.') }}>Agregar al carrito</Button><Button asChild variant="outline"><Link to="/carrito">Ver carrito</Link></Button></div><p role="status">{notice}</p></> : <><p>Sin opciones disponibles.</p><Button asChild variant="outline"><Link to="/contacto">Consultar este producto</Link></Button></>}<p className="product-availability">Trabajamos por pedido. Precio final, tamaños y plazos a confirmar al cotizar.</p>{product.care && <section><h2>Cuidados</h2><p>{product.care}</p></section>}</div></div></section>
}
