import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { CART_KEY, readCart, changeQuantity, cartItemId } from '@/lib/cart'
import { catalogService } from '@/services/catalog'
import { refreshCartSnapshot } from '@/lib/cart-sync'
const CartContext = createContext(null)
export function CartProvider({ children }) {
  const [initial] = useState(() => { try { return readCart(window.localStorage) } catch { return { items: [], warning: 'El carrito no se podrá guardar en este navegador.' } } })
  const [items, setItems] = useState(initial.items)
  const [warning, setWarning] = useState(initial.warning)
  const [products, setProducts] = useState([])
  const [cached, setCached] = useState([])
  const [sync, setSync] = useState({ status: initial.items.length ? 'checking' : 'ready', message: '', checkedAt: 0, revision: 0 })
  const itemsRef = useRef(items), productsRef = useRef([]), requestRef = useRef(0)
  itemsRef.current = items
  const refresh = useCallback(async () => {
    const ticket = ++requestRef.current
    const requested = itemsRef.current
    const signature = JSON.stringify(requested)
    if (!requested.length) {
      setProducts([]); productsRef.current = []
      setSync({ status: 'ready', message: '', checkedAt: Date.now(), revision: ticket })
      return { items: [], products: [], lines: [], signature }
    }
    setSync(s => ({ ...s, status: 'checking', message: 'Actualizando precios y opciones…' }))
    try {
      const snapshot = await refreshCartSnapshot(catalogService(), requested, productsRef.current)
      if (ticket !== requestRef.current || signature !== JSON.stringify(itemsRef.current)) return null
      productsRef.current = snapshot.products
      setProducts(snapshot.products)
      setCached(old => [...new Map([...old, ...snapshot.products].map(p => [p.id, p])).values()])
      const checkedAt = Date.now()
      setSync({ status: 'ready', checkedAt, revision: ticket, message: snapshot.changed ? 'Cambiaron precios o condiciones de tu selección. Revisá la información actualizada; conservamos tus cantidades.' : 'Precios y opciones actualizados. Revisalos antes de enviar.' })
      return { ...snapshot, signature, checkedAt, revision: ticket }
    } catch {
      if (ticket === requestRef.current && signature === JSON.stringify(itemsRef.current)) {
        setSync({ status: 'error', checkedAt: 0, revision: ticket, message: 'No pudimos actualizar el carrito. Conservamos tu selección. Reintentá antes de preparar la consulta.' })
      }
      return null
    }
  }, [])
  useEffect(() => {
    try { window.localStorage.setItem(CART_KEY, JSON.stringify(items)) }
    catch { setWarning('El carrito funciona en esta visita, pero no se puede guardar en este navegador.') }
    refresh()
  }, [items, refresh])
  useEffect(() => {
    const handleFocus = () => { if (itemsRef.current.length) refresh() }
    window.addEventListener('focus', handleFocus)
    return () => { window.removeEventListener('focus', handleFocus); requestRef.current++ }
  }, [refresh])
  const add = (id, amount, product) => {
    if (product) {
      productsRef.current = [...productsRef.current.filter(p => p.id !== product.id), product]
      setCached(old => [...old.filter(p => p.id !== product.id), product])
    }
    setItems(current => changeQuantity(current, id, amount, true))
  }
  return <CartContext.Provider value={{ items, products, cached, sync, refresh, warning,
    count: items.reduce((sum, item) => sum + item.quantity, 0), add,
    addProduct: (product, amount = 1) => add(`product:${product.id}`, amount, product),
    update: (id, amount) => setItems(current => changeQuantity(current, id, amount)),
    remove: id => setItems(current => current.filter(i => cartItemId(i) !== id)), clear: () => setItems([]),
  }}>{children}</CartContext.Provider>
}
export const useCart = () => useContext(CartContext)
