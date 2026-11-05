// Solo desarrollo: Vite elimina este producto del catálogo de producción.
export const demoProduct = import.meta.env.DEV ? {
  id: 'demo-maceta', slug: 'maceta-geometrica-demo', name: 'Maceta geométrica',
  category: 'Decoración', demo: true, published: true, featured: true, images: [],
  care: 'Ejemplo: limpiar con un paño húmedo y evitar fuentes de calor. Indicaciones ficticias pendientes de validar.',
  description: 'Producto ficticio para probar la tarjeta y la selección de opciones. No está a la venta.',
  variants: [
    { id: 'demo-small', sku: 'DEMO-MAC-P-PLA-BLA', material: 'PLA', color: 'Blanco', size: 'Pequeña', name: 'Pequeña · PLA · Blanco', priceMode: 'fijo', price: 5000, currency: 'ARS', availability: 'bajo_pedido', days: 3, active: true, dimensions: '80 × 90 × 80 mm' },
    { id: 'demo-medium', sku: 'DEMO-MAC-M-PLA-CEL', material: 'PLA', color: 'Celeste', size: 'Mediana', name: 'Mediana · PLA · Celeste', priceMode: 'a_acordar', price: null, currency: null, availability: 'bajo_pedido', days: null, active: true, dimensions: '120 × 140 × 120 mm' },
  ],
} : null
