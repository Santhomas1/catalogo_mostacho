import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { siteOrigin } from './src/lib/metadata.js'

export default defineConfig(({ mode }) => {
  const origin = siteOrigin(loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL || '')
  return {
    optimizeDeps: { exclude: ['@jsquash/webp'] },
    build: { rollupOptions: { output: { manualChunks(id) {
      if (id.includes('node_modules/@supabase')) return 'supabase'
      if (/node_modules\/(react|react-dom|react-router|scheduler)/.test(id)) return 'react'
    } } } },
    plugins: [react(), tailwindcss(), { name: 'share-image-origin', transformIndexHtml(html) {
      return origin ? html.replaceAll('content="/logo/mostacho.png"', `content="${origin}/logo/mostacho.png"`) : html
    } }],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  }
})
