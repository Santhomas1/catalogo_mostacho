import { readFile, writeFile } from 'node:fs/promises'
import { loadEnv } from 'vite'
import { business } from '../src/lib/business.js'
import { PRODUCTION_ORIGIN, routeMetadata, SHARE_IMAGE, siteOrigin } from '../src/lib/metadata.js'

const origin = siteOrigin(loadEnv('production', process.cwd(), 'VITE_').VITE_SITE_URL || PRODUCTION_ORIGIN)
const template = await readFile('dist/index.html', 'utf8')
const pages = [
  { path: '/', file: 'index.html', heading: `Impresión 3D por pedido en ${business.city}` },
  { path: '/catalogo', file: 'catalogo.html', heading: 'Catálogo de impresión 3D' },
  { path: '/contacto', file: 'contacto.html', heading: 'Contacto de Mostacho 3D' },
]
const navigation = '<nav aria-label="Navegación principal"><a href="/">Inicio</a> · <a href="/catalogo">Catálogo</a> · <a href="/contacto">Contacto</a></nav>'
const image = new URL(SHARE_IMAGE, origin).href
const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${origin}/#organization`,
  name: business.name,
  url: `${origin}/`,
  logo: image,
  address: {
    '@type': 'PostalAddress',
    addressLocality: business.city,
    addressRegion: business.region,
    addressCountry: business.countryCode,
  },
  areaServed: {
    '@type': 'City',
    name: business.city,
    containedInPlace: {
      '@type': 'AdministrativeArea',
      name: business.region,
      containedInPlace: { '@type': 'Country', name: business.country },
    },
  },
  sameAs: [business.instagram],
}
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')

for (const { path, file, heading } of pages) {
  const { title, description } = routeMetadata(path)
  const url = new URL(path, origin).href
  const staticContent = `<main class="container"><h1>${heading}</h1><p>${escape(description)}</p>${navigation}<p><a href="${business.whatsapp}">Consultar por WhatsApp</a> · <a href="${business.instagram}">Instagram</a></p></main>`
  const tags = `<link rel="canonical" href="${escape(url)}" />\n    <meta property="og:url" content="${escape(url)}" />`
  const structuredData = path === '/' ? `\n    <script type="application/ld+json">${JSON.stringify(organization)}</script>` : ''
  const html = template
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escape(title)}</title>`)
    .replace(/(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*/g, (_, prefix) => prefix + escape(description))
    .replace(/(<meta (?:name|property)="(?:og:title|twitter:title)" content=")[^"]*/g, (_, prefix) => prefix + escape(title))
    .replace(/(<meta (?:name|property)="(?:og:image|twitter:image)" content=")[^"]*/g, (_, prefix) => prefix + escape(image))
    .replace('</head>', () => `  ${tags}${structuredData}\n  </head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${staticContent}</div>`)
  await writeFile(`dist/${file}`, html)
}

// Dynamic routes retain the SPA entry point and set their metadata after loading.
await writeFile('dist/app.html', template)
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`)
