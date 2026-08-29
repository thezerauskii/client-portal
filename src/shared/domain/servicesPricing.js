/**
 * Shared domain: Services / Pricing (commission sheet).
 *
 * Data model shared between the Electron editor and the portal public page.
 * Pure data/functions — no imports.
 *
 * Shape stored in profiles.services_pricing (jsonb):
 * {
 *   status: 'open' | 'waitlist' | 'closed',
 *   statusMessage: string,
 *   currency: 'USD',
 *   headerImage: string (url),
 *   intro: string,               // short paragraph above the services
 *   services: [{ id, title, description, price, priceMax, images:[url], nsfw, available, sortOrder }],
 *   addons: [{ id, name, price }]
 * }
 */

/** Block types for the rich content editor (Google-Forms style). */
export const SERVICE_BLOCK_TYPES = [
  { type: 'h1', label: 'Título grande' },
  { type: 'h2', label: 'Subtítulo' },
  { type: 'paragraph', label: 'Párrafo' },
  { type: 'image', label: 'Imagen(es)' },
  { type: 'divider', label: 'Separador' },
]

/** Create a new content block. */
export function makeBlock(type) {
  const id = 'blk_' + Math.random().toString(36).slice(2, 9)
  if (type === 'image') return { id, type, images: [] }
  return { id, type, content: '' }
}

/** Create a decorative sticker entry (view-only in portal). */
export function makeSticker(url) {
  return {
    id: 'stk_' + Math.random().toString(36).slice(2, 9),
    url,
    x: 40 + Math.random() * 20,  // % position
    y: 40 + Math.random() * 20,
    scale: 1,
    rot: (Math.random() * 22) - 11,
  }
}

export function makeDefaultServices() {
  return {
    status: 'open',
    statusMessage: '',
    currency: 'USD',
    headerImage: '',
    bannerUrl: '',            // wide banner at top of the page
    backgroundUrl: '',        // full-page background image
    backgroundOpacity: 0.85,  // overlay darkness (0..1)
    intro: 'Estos son mis tipos de comisión y precios. ¡Escríbeme si tienes dudas!',
    blocks: [],               // rich content blocks (headings, paragraphs, images)
    stickers: [],             // decorative stickers (view-only in portal)
    services: [
      { id: 'svc_1', title: 'Busto', description: 'Personaje de pecho hacia arriba, color completo.', price: '25', priceMax: '', images: [], nsfw: false, available: true, sortOrder: 0 },
      { id: 'svc_2', title: 'Cuerpo completo', description: 'Personaje completo con fondo simple.', price: '50', priceMax: '', images: [], nsfw: false, available: true, sortOrder: 1 },
      { id: 'svc_3', title: 'Ref sheet', description: 'Hoja de referencia con vistas y detalles.', price: '80', priceMax: '120', images: [], nsfw: false, available: true, sortOrder: 2 },
    ],
    addons: [
      { id: 'add_1', name: 'Personaje extra', price: '+20' },
      { id: 'add_2', name: 'Fondo detallado', price: '+15' },
      { id: 'add_3', name: 'NSFW', price: '+30%' },
    ],
  }
}

export function makeService(sortOrder = 0) {
  return {
    id: 'svc_' + Math.random().toString(36).slice(2, 9),
    title: '',
    description: '',
    price: '',
    priceMax: '',
    images: [],
    nsfw: false,
    available: true,
    sortOrder,
  }
}

export function makeAddon() {
  return { id: 'add_' + Math.random().toString(36).slice(2, 9), name: '', price: '' }
}

/** Normalize a services object so both apps always get a valid shape. */
export function normalizeServices(data) {
  if (!data || !Array.isArray(data.services)) return makeDefaultServices()
  return {
    status: data.status || 'open',
    statusMessage: data.statusMessage || '',
    currency: data.currency || 'USD',
    headerImage: data.headerImage || '',
    bannerUrl: data.bannerUrl || '',
    backgroundUrl: data.backgroundUrl || '',
    backgroundOpacity: typeof data.backgroundOpacity === 'number' ? data.backgroundOpacity : 0.85,
    intro: data.intro || '',
    blocks: Array.isArray(data.blocks) ? data.blocks.map((b, i) => ({
      id: b.id || 'blk_' + i,
      type: b.type || 'paragraph',
      content: b.content || '',
      images: Array.isArray(b.images) ? b.images : [],
    })) : [],
    stickers: Array.isArray(data.stickers) ? data.stickers.map((s, i) => ({
      id: s.id || 'stk_' + i,
      url: s.url || '',
      x: typeof s.x === 'number' ? s.x : 50,
      y: typeof s.y === 'number' ? s.y : 50,
      scale: typeof s.scale === 'number' ? s.scale : 1,
      rot: typeof s.rot === 'number' ? s.rot : 0,
    })) : [],
    services: data.services.map((s, i) => ({
      id: s.id || 'svc_' + i,
      title: s.title || '',
      description: s.description || '',
      price: s.price || '',
      priceMax: s.priceMax || '',
      images: Array.isArray(s.images) ? s.images : [],
      nsfw: !!s.nsfw,
      available: s.available !== false,
      sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : i,
    })),
    addons: Array.isArray(data.addons) ? data.addons.map((a, i) => ({
      id: a.id || 'add_' + i, name: a.name || '', price: a.price || '',
    })) : [],
  }
}

/** Format a price with currency and optional range. */
export function formatPrice(service, currency = 'USD') {
  const sym = currency === 'USD' ? '$' : ''
  if (!service.price) return 'Consultar'
  if (service.priceMax) return `${sym}${service.price} – ${sym}${service.priceMax} ${currency}`
  return `${sym}${service.price} ${currency}`
}
