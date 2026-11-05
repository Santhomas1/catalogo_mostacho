import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Contact from '@/pages/Contact'
import EmptyPage from '@/pages/EmptyPage'
import AdminPage from '@/admin/AdminPage'
import Catalog from '@/pages/Catalog'
import Product from '@/pages/Product'
import Cart from '@/pages/Cart'

export default function App() {
  return <Routes><Route element={<Layout />}>
    <Route index element={<Home />} />
    <Route path="catalogo" element={<Catalog />} />
    <Route path="productos/:slug" element={<Product />} />
    <Route path="carrito" element={<Cart />} />
    <Route path="contacto" element={<Contact />} />
    <Route path="admin/*" element={<AdminPage />} />

    <Route path="*" element={<EmptyPage eyebrow="404 · PÁGINA NO ENCONTRADA" title="Esta idea se fue por otro lado." description="La dirección que abriste no corresponde a una página del sitio." />} />
  </Route></Routes>
}
