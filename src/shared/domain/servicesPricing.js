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

export function makeDefaultServices() {
  return {
    status: 'open',
    statusMessage: '',
    currency: 'USD',
    headerImage: '',
    intro: 'Estos son mis tipos de comisión y precios. ¡Escríbeme si tienes dudas!',
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
    intro: data.intro || '',
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
