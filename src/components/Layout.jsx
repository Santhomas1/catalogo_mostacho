import { useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, X, ShoppingBag, ArrowUpRight, Instagram, MapPin, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { business } from '@/lib/business'
import { useCart } from '@/components/CartProvider'
import PageMetadata from '@/components/PageMetadata'

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { count } = useCart()
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [pathname])
  return <div className="site">
    <PageMetadata />
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="wordmark" aria-label="Mostacho 3D, inicio"><img className="brand-logo" src="/logo/mostacho.png" alt="Mostacho 3D Prints" width="1536" height="1024" /></Link>
        <nav aria-label="Navegación principal" className="desktop-nav">
          <NavLink to="/" end>Inicio</NavLink><NavLink to="/catalogo">Catálogo</NavLink><NavLink to="/contacto">Contacto</NavLink>
        </nav>
        <div className="header-actions">
          <Button asChild variant="outline" size="icon"><Link className="cart-link" to="/carrito" aria-label={`Ver carrito, ${count} unidades`}><ShoppingBag />{count > 0 && <span className="cart-count">{count}</span>}</Link></Button>
          <Button className="desktop-contact" asChild><a href={business.whatsapp} target="_blank" rel="noreferrer">Contanos tu idea <ArrowUpRight /></a></Button>
          <Button className="mobile-toggle" variant="ghost" size="icon" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button>
        </div>
      </div>
      {open && <nav id="mobile-nav" className="mobile-nav container" aria-label="Navegación móvil" onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); document.querySelector('.mobile-toggle')?.focus() } }}>
        <NavLink to="/" end>Inicio</NavLink><NavLink to="/catalogo">Catálogo</NavLink><NavLink to="/contacto">Contacto</NavLink>
      </nav>}
    </header>
    <main id="contenido" tabIndex={-1}><Outlet /></main>
    {pathname.replace(/\/+$/, '') !== '/contacto' && <footer className="footer"><div className="container footer-inner"><div className="footer-identity"><Link className="footer-brand" to="/" aria-label="Mostacho 3D, inicio"><img className="brand-logo brand-logo-footer" src="/logo/mostacho.png" alt="Mostacho 3D Prints" width="1536" height="1024" loading="lazy" /></Link><p>Ideas con forma propia.</p></div><div className="footer-location"><h2><MapPin aria-hidden="true" />Ubicación</h2><p>San Miguel de Tucumán - Tucumán</p><p>Retiro coordinado</p></div><div className="footer-links"><a className="social-link" href={business.instagram} target="_blank" rel="noreferrer" aria-label="Instagram de Mostacho 3D (abre en otra pestaña)" title="Instagram"><Instagram aria-hidden="true" /></a><a className="social-link" href={business.whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp de Mostacho 3D (abre en otra pestaña)" title="WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.88 11.88 0 0 0 12.05 0C5.47 0 .12 5.35.12 11.93c0 2.1.55 4.15 1.6 5.96L0 24l6.25-1.64a11.93 11.93 0 0 0 5.8 1.48h.01C18.64 23.84 24 18.49 24 11.91c0-3.18-1.24-6.18-3.48-8.43ZM12.06 21.82a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.71.97.99-3.62-.24-.37a9.87 9.87 0 0 1-1.52-5.28c0-5.46 4.44-9.9 9.89-9.9a9.84 9.84 0 0 1 7 2.9 9.83 9.83 0 0 1 2.9 7c0 5.46-4.44 9.89-9.91 9.89Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.8-1.49-1.78-1.66-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.71.22 1.36.19 1.87.11.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z" /></svg></a><Link className="social-link" to="/admin" aria-label="Administración" title="Administración"><ShieldCheck aria-hidden="true" /></Link></div></div></footer>}
  </div>
}
